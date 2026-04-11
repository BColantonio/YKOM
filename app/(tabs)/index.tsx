import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView, Pressable as GesturePressable } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useKinks } from '@/contexts/kinks-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getUnlockKinksForParentId, type DeckKink } from '@/lib/deck-unlock';
import { formatAuthError } from '@/lib/format-auth-error';
import { rootKinksToDeck } from '@/lib/kinks';
import { supabase } from '@/lib/supabase';
import { SWIPE_LABELS, SWIPE_STAMP_COLORS, SWIPE_VALUES, type SwipeDirection } from '@/lib/kink-preference-values';
import { SWIPE_LIMIT } from '@/lib/swipe-limit';
import {
  fetchMostRecentComparisonUserPreferences,
  initializeUserKinkPreferences,
  upsertUserKinkPreferences,
} from '@/lib/user-kink-preferences';

/** Swipe card model; `description` powers tap-to-expand copy from `public.kinks`. */
type KinkCategory = DeckKink;
type KinkSwipeResult = { kinkId: number; value: number };
type PreferenceValue = number | null;

const DEV_HARDCODED_MODE = true;

/** Max height of the description panel when fully expanded (animated open). */
const DESCRIPTION_PANEL_MAX = 200;

function categoryCompatibility(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return 100 - diff;
}

function shuffleArray<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function overallCompatibility(categories: KinkCategory[], aPrefs: Map<number, PreferenceValue>, bPrefs: Map<number, PreferenceValue>) {
  let sum = 0;
  let comparableCount = 0;
  for (const kink of categories) {
    const a = aPrefs.get(kink.id);
    const b = bPrefs.get(kink.id);
    if (a == null || b == null) continue;
    sum += categoryCompatibility(a, b);
    comparableCount += 1;
  }
  if (comparableCount === 0) return null;
  return sum / comparableCount;
}

function SwipeCard({
  kink,
  onSwipeComplete,
  isTop,
  backScale,
  cardWidth,
  cardHeight,
  swipeThreshold,
  screenWidth,
  screenHeight,
  accent,
  muted,
  gestureDisabled = false,
}: {
  kink: KinkCategory;
  onSwipeComplete: (direction: SwipeDirection, kink: KinkCategory) => void;
  isTop: boolean;
  backScale: number;
  gestureDisabled?: boolean;
  cardWidth: number;
  /** Minimum height for the collapsed card (also used to size the inner face). */
  cardHeight: number;
  swipeThreshold: number;
  screenWidth: number;
  screenHeight: number;
  accent: string;
  muted: string;
}) {
  const descriptionText = kink.description?.trim() ?? '';
  const hasDescription = descriptionText.length > 0;
  const [expanded, setExpanded] = useState(false);
  const expandProgress = useSharedValue(0);

  useEffect(() => {
    setExpanded(false);
    expandProgress.value = 0;
  }, [kink.id]);

  useEffect(() => {
    expandProgress.value = withTiming(expanded ? 1 : 0, { duration: 320 });
  }, [expanded]);

  const toggleExpanded = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((v) => !v);
  }, []);

  const x = useSharedValue(0);
  const y = useSharedValue(0);

  const finishSwipe = useCallback(
    (direction: SwipeDirection) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSwipeComplete(direction, kink);
    },
    [onSwipeComplete, kink],
  );

  /** Full-card pan only — expand/collapse is on a separate RNGH `Pressable` so swipes are never competed with taps. */
  const pan = Gesture.Pan()
    .enabled(isTop && !gestureDisabled)
    .onUpdate((e) => {
      x.value = e.translationX;
      y.value = e.translationY;
    })
    .onEnd((e) => {
      const tx = e.translationX;
      const ty = e.translationY;
      if (Math.abs(tx) < swipeThreshold && Math.abs(ty) < swipeThreshold) {
        x.value = withSpring(0, { damping: 18, stiffness: 220 });
        y.value = withSpring(0, { damping: 18, stiffness: 220 });
        return;
      }
      const direction: SwipeDirection = Math.abs(tx) >= Math.abs(ty) ? (tx < 0 ? 'no' : 'yes') : ty < 0 ? 'mood' : 'probablyNot';
      const exitX = direction === 'no' ? -screenWidth * 1.25 : direction === 'yes' ? screenWidth * 1.25 : 0;
      const exitY = direction === 'mood' ? -screenHeight * 0.85 : direction === 'probablyNot' ? screenHeight * 0.85 : 0;
      x.value = withSpring(exitX, { damping: 22, stiffness: 180 }, (finished) => {
        if (finished) runOnJS(finishSwipe)(direction);
      });
      y.value = withSpring(exitY, { damping: 22, stiffness: 180 });
    });

  const cardStyle = useAnimatedStyle(
    () => ({
      transform: [
        { translateX: x.value },
        { translateY: y.value },
        { rotate: `${interpolate(x.value, [-screenWidth / 2, 0, screenWidth / 2], [-12, 0, 12])}deg` },
        { scale: backScale },
      ],
    }),
    [backScale, screenWidth],
  );

  const stampRange = swipeThreshold * 1.5;
  const noOverlay = useAnimatedStyle(() => {
    const ax = Math.abs(x.value);
    const ay = Math.abs(y.value);
    if (ax < ay) return { opacity: 0 };
    return {
      opacity: interpolate(x.value, [-stampRange, 0], [1, 0], Extrapolation.CLAMP),
    };
  }, [stampRange]);
  const yesOverlay = useAnimatedStyle(() => {
    const ax = Math.abs(x.value);
    const ay = Math.abs(y.value);
    if (ax < ay) return { opacity: 0 };
    return {
      opacity: interpolate(x.value, [0, stampRange], [0, 1], Extrapolation.CLAMP),
    };
  }, [stampRange]);
  const moodOverlay = useAnimatedStyle(() => {
    const ax = Math.abs(x.value);
    const ay = Math.abs(y.value);
    if (ax >= ay) return { opacity: 0 };
    return {
      opacity: interpolate(y.value, [-stampRange, 0], [1, 0], Extrapolation.CLAMP),
    };
  }, [stampRange]);
  const maybeOverlay = useAnimatedStyle(() => {
    const ax = Math.abs(x.value);
    const ay = Math.abs(y.value);
    if (ax >= ay) return { opacity: 0 };
    return {
      opacity: interpolate(y.value, [0, stampRange], [0, 1], Extrapolation.CLAMP),
    };
  }, [stampRange]);

  const descriptionPanelStyle = useAnimatedStyle(() => {
    const open = expandProgress.value;
    return {
      maxHeight: interpolate(open, [0, 1], [0, DESCRIPTION_PANEL_MAX]),
      opacity: interpolate(open, [0, 0.12, 1], [0, 0, 1]),
      marginTop: interpolate(open, [0, 1], [0, 6]),
    };
  }, []);

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.card,
          {
            width: cardWidth,
            minHeight: cardHeight,
            zIndex: isTop ? 2 : 1,
          },
          cardStyle,
        ]}>
        <ThemedView style={[styles.cardInner, { borderColor: `${accent}55`, minHeight: cardHeight }]}>
          {kink.parentLabel ? (
            <ThemedText style={[styles.cardParentLabel, { color: muted }]} numberOfLines={2}>
              {kink.parentLabel}
            </ThemedText>
          ) : null}
          <ThemedText type="title" style={styles.cardTitle}>
            {kink.label}
          </ThemedText>
          {hasDescription ? (
            <GesturePressable
              accessibilityRole="button"
              accessibilityLabel={expanded ? 'Hide kink description' : 'Show kink description'}
              hitSlop={{ top: 12, bottom: 12, left: 20, right: 20 }}
              onPress={toggleExpanded}
              style={styles.cardTapHintPressable}>
              <ThemedText style={[styles.cardTapHint, { color: muted }]}>
                {expanded ? 'Tap to hide · swipe the card to decide' : 'Tap here for details · swipe the card to decide'}
              </ThemedText>
            </GesturePressable>
          ) : (
            <ThemedText style={[styles.cardHint, { color: muted }]}>Swipe to decide</ThemedText>
          )}
          {hasDescription ? (
            <Animated.View style={[styles.cardDescriptionWrap, descriptionPanelStyle]} pointerEvents="box-none">
              <ScrollView
                pointerEvents={expanded ? 'auto' : 'none'}
                style={styles.cardDescriptionScroll}
                contentContainerStyle={styles.cardDescriptionScrollContent}
                nestedScrollEnabled
                showsVerticalScrollIndicator={descriptionText.length > 160}>
                <ThemedText style={[styles.cardDescription, { color: muted }]}>{descriptionText}</ThemedText>
              </ScrollView>
            </Animated.View>
          ) : null}

          <Animated.View style={[styles.stamp, styles.stampLeft, { borderColor: SWIPE_STAMP_COLORS.no }, noOverlay]}>
            <ThemedText style={[styles.stampText, { color: SWIPE_STAMP_COLORS.no }]}>{SWIPE_LABELS.no}</ThemedText>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.stampRight, { borderColor: SWIPE_STAMP_COLORS.yes }, yesOverlay]}>
            <ThemedText style={[styles.stampText, { color: SWIPE_STAMP_COLORS.yes }]}>{SWIPE_LABELS.yes}</ThemedText>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.stampTop, { borderColor: SWIPE_STAMP_COLORS.mood }, moodOverlay]}>
            <ThemedText style={[styles.stampText, { color: SWIPE_STAMP_COLORS.mood }]}>{SWIPE_LABELS.mood}</ThemedText>
          </Animated.View>
          <Animated.View
            style={[styles.stamp, styles.stampBottom, { borderColor: SWIPE_STAMP_COLORS.probablyNot }, maybeOverlay]}>
            <ThemedText style={[styles.stampText, { color: SWIPE_STAMP_COLORS.probablyNot }]}>
              {SWIPE_LABELS.probablyNot}
            </ThemedText>
          </Animated.View>
        </ThemedView>
      </Animated.View>
    </GestureDetector>
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { kinks, loading: kinksLoading } = useKinks();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const swipeThreshold = useMemo(() => Math.min(120, screenWidth * 0.22), [screenWidth]);
  const cardWidth = useMemo(() => Math.min(screenWidth * 0.9, 400), [screenWidth]);
  /** Minimum height when collapsed: ties to card width (~1:0.7) and screen, clamped so the deck feels substantial on all phones. */
  const cardHeight = useMemo(() => {
    const fromScreen = screenHeight * 0.44;
    const fromAspect = cardWidth * 0.72;
    const blended = Math.max(fromScreen, fromAspect);
    return Math.round(Math.min(420, Math.max(312, blended)));
  }, [screenHeight, cardWidth]);

  const [index, setIndex] = useState(0);
  const [swipeResults, setSwipeResults] = useState<KinkSwipeResult[]>([]);
  const [kinkCategories, setKinkCategories] = useState<KinkCategory[]>([]);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [otherUserPrefs, setOtherUserPrefs] = useState<Map<number, PreferenceValue>>(new Map());
  /** True after load when no other user had preferences to compare against. */
  const [comparisonUnavailable, setComparisonUnavailable] = useState(false);
  const [compatibilityScore, setCompatibilityScore] = useState<number | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [swipesUsed, setSwipesUsed] = useState(0);
  const [unlockToast, setUnlockToast] = useState<{ count: number } | null>(null);
  const unlockToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deckRef = useRef<KinkCategory[]>([]);
  /** One-time deck + session bootstrap after kinks load from Supabase. */
  const deckBootstrapRef = useRef(false);
  useEffect(() => {
    deckRef.current = kinkCategories;
  }, [kinkCategories]);

  const showUnlockToast = useCallback((count: number) => {
    if (unlockToastTimerRef.current) {
      clearTimeout(unlockToastTimerRef.current);
      unlockToastTimerRef.current = null;
    }
    setUnlockToast({ count });
    unlockToastTimerRef.current = setTimeout(() => {
      setUnlockToast(null);
      unlockToastTimerRef.current = null;
    }, 2600);
  }, []);

  useEffect(() => {
    return () => {
      if (unlockToastTimerRef.current) clearTimeout(unlockToastTimerRef.current);
    };
  }, []);

  const atSwipeLimit = swipesUsed >= SWIPE_LIMIT;

  useEffect(() => {
    if (kinksLoading || deckBootstrapRef.current) return;
    const deck = rootKinksToDeck(kinks);
    if (deck.length === 0) {
      setAuthMessage('No active kinks in the database. Apply migrations and seed.');
      setPrefsLoading(false);
      return;
    }
    deckBootstrapRef.current = true;
    setKinkCategories(deck);

    let cancelled = false;
    void (async () => {
      setPrefsLoading(true);
      const initialDeck = deck;
      if (DEV_HARDCODED_MODE) {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError && sessionError.message !== 'Auth session missing!') {
          console.error('Failed to get current Supabase session:', formatAuthError(sessionError));
        }
        let user = sessionData.session?.user ?? null;
        let anonError: unknown = null;
        if (!user) {
          const anon = await supabase.auth.signInAnonymously();
          anonError = anon.error;
          if (anon.error) {
            console.error('Anonymous sign-in failed:', formatAuthError(anon.error));
          }
          user = anon.data.user ?? null;
        }
        if (!user) {
          if (!cancelled) {
            setAuthMessage(
              anonError
                ? `Anonymous sign-in failed: ${formatAuthError(anonError)}`
                : 'Anonymous sign-in did not return a user. Try again.',
            );
            setPrefsLoading(false);
          }
          return;
        }
        setCurrentUserId(user.id);
        await initializeUserKinkPreferences(user.id, initialDeck.map((k) => k.id), null);
        const loaded = await fetchMostRecentComparisonUserPreferences(user.id);
        setOtherUserPrefs(loaded?.prefs ?? new Map());
        setComparisonUnavailable(!loaded);
        setAuthMessage('Dev mode: anonymous session.');
        setPrefsLoading(false);
        return;
      }
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError && sessionError.message !== 'Auth session missing!') {
        console.error('Failed to get current Supabase session:', formatAuthError(sessionError));
      }

      let user = sessionData.session?.user ?? null;
      let lastAnonError: unknown = null;
      if (!user) {
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
        lastAnonError = anonError ?? null;
        if (anonError) {
          const msg = formatAuthError(anonError);
          if (msg.toLowerCase().includes('anonymous sign-ins are disabled')) {
            setAuthMessage('Enable anonymous auth in Supabase or sign in with a user account.');
          } else {
            console.error('Anonymous sign-in failed:', msg);
            setAuthMessage(`Sign-in failed: ${msg}`);
          }
        }
        user = anonData.user ?? null;
      }

      if (!user) {
        if (!cancelled) {
          if (!lastAnonError) {
            setAuthMessage('Could not establish a session. Check network and Supabase settings.');
          }
          setPrefsLoading(false);
        }
        return;
      }

      const userId = user.id;
      setCurrentUserId(userId);
      setAuthMessage(null);
      await initializeUserKinkPreferences(userId, initialDeck.map((k) => k.id), null);
      const loaded = await fetchMostRecentComparisonUserPreferences(userId);
      if (cancelled) return;
      setOtherUserPrefs(loaded?.prefs ?? new Map());
      setComparisonUnavailable(!loaded);
      setPrefsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [kinks, kinksLoading]);

  useEffect(() => {
    if (!currentUserId || index !== kinkCategories.length || hasSaved) return;
    void (async () => {
      const ok = await upsertUserKinkPreferences(
        currentUserId,
        kinkCategories.map((kink) => ({
          kinkId: kink.id,
          value: swipeResults.find((r) => r.kinkId === kink.id)?.value ?? null,
        })),
      );
      if (ok) {
        setHasSaved(true);
        setSaveMessage(
          DEV_HARDCODED_MODE
            ? `Preferences saved to DB as ${currentUserId ?? 'anonymous user'}.`
            : 'Preferences saved.',
        );
        const peer = await fetchMostRecentComparisonUserPreferences(currentUserId);
        setOtherUserPrefs(peer?.prefs ?? new Map());
        setComparisonUnavailable(!peer);
      } else {
        setSaveMessage('Save failed. Check console for Supabase error details.');
      }
    })();
  }, [index, swipeResults, hasSaved, currentUserId, kinkCategories]);

  useEffect(() => {
    if (kinkCategories.length === 0) return;
    const myPrefs = new Map<number, PreferenceValue>();
    for (const kink of kinkCategories) {
      myPrefs.set(kink.id, swipeResults.find((r) => r.kinkId === kink.id)?.value ?? null);
    }
    const score = overallCompatibility(kinkCategories, myPrefs, otherUserPrefs);
    setCompatibilityScore(score);
  }, [swipeResults, otherUserPrefs, kinkCategories]);

  const onSwipeComplete = useCallback(
    (direction: SwipeDirection, kink: KinkCategory) => {
      if (swipesUsed >= SWIPE_LIMIT) return;
      const value = SWIPE_VALUES[direction];

      let fetched: DeckKink[] = [];
      if (value === 67 || value === 100) {
        fetched = getUnlockKinksForParentId(kink.id, kinks);
      }

      const prev = deckRef.current;
      const pos = prev.findIndex((k) => k.id === kink.id);
      const ids = new Set(prev.map((k) => k.id));
      const unique = fetched.filter((u) => !ids.has(u.id));
      if (unique.length > 0 && pos >= 0) {
        // Keep the card that was already behind the swiped card (still "in view" as the back of the stack)
        // at the immediate next slot; shuffle new unlocks only into the rest of the deck.
        const stayNext = prev[pos + 1];
        const deeper = prev.slice(pos + 2);
        const pool = [...unique, ...deeper];
        const shuffledPool = shuffleArray(pool);
        const nextDeck =
          stayNext != null
            ? [...prev.slice(0, pos + 1), stayNext, ...shuffledPool]
            : [...prev.slice(0, pos + 1), ...shuffledPool];
        setKinkCategories(nextDeck);
        showUnlockToast(unique.length);
        if (currentUserId) {
          void initializeUserKinkPreferences(
            currentUserId,
            unique.map((k) => k.id),
            null,
          );
        }
      }

      setSwipeResults((p) => [...p, { kinkId: kink.id, value }]);
      setIndex((i) => i + 1);
      setSwipesUsed((n) => n + 1);
    },
    [swipesUsed, currentUserId, showUnlockToast, kinks],
  );

  const current = kinkCategories[index];
  const next = kinkCategories[index + 1];

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemedView style={[styles.screen, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 12 }]}>
        <ThemedText type="subtitle">Your kink or mine</ThemedText>
        <ThemedText style={[styles.subheading, { color: palette.icon }]}>
          Left no · Right yes · Up get me in the mood first · Down maybe
        </ThemedText>
        {authMessage ? <ThemedText style={[styles.subheading, { color: palette.icon }]}>{authMessage}</ThemedText> : null}
        {currentUserId == null ? (
          <ThemedText style={[styles.subheading, { color: palette.icon }]}>Sign in to save preferences.</ThemedText>
        ) : null}
        {saveMessage ? <ThemedText style={[styles.subheading, { color: palette.icon }]}>{saveMessage}</ThemedText> : null}
        {currentUserId != null && !prefsLoading && atSwipeLimit && current != null ? (
          <ThemedText style={[styles.limitBanner, { color: palette.icon }]}>
            You&apos;ve reached your swipe limit. Upgrade for unlimited swipes.
          </ThemedText>
        ) : null}
        {currentUserId != null && !prefsLoading && current != null && !atSwipeLimit ? (
          <ThemedText style={[styles.swipeCount, { color: palette.icon }]}>
            Swipes: {swipesUsed}/{SWIPE_LIMIT}
          </ThemedText>
        ) : null}
        {currentUserId != null && !prefsLoading && current != null && comparisonUnavailable ? (
          <ThemedText style={[styles.comparisonFallback, { color: palette.icon }]}>
            No profiles available to compare yet
          </ThemedText>
        ) : null}
        {currentUserId != null && !prefsLoading && current != null && !comparisonUnavailable && compatibilityScore != null ? (
          <ThemedText type="defaultSemiBold" style={[styles.compatibilityLive, { color: palette.tint }]}>
            Compatibility: {Math.round(compatibilityScore * 10) / 10}%
          </ThemedText>
        ) : null}
        <View style={styles.deck}>
          {prefsLoading || kinksLoading ? (
            <ActivityIndicator size="large" color={palette.tint} />
          ) : currentUserId == null ? (
            <ThemedView
              style={[styles.empty, { width: cardWidth, minHeight: cardHeight, borderColor: `${palette.tint}44` }]}>
              <ThemedText type="title">Authentication required</ThemedText>
              <ThemedText style={{ color: palette.icon, textAlign: 'center' }}>
                Sign in (or enable anonymous auth) before swiping so preferences can be saved.
              </ThemedText>
            </ThemedView>
          ) : current == null ? (
            <ThemedView
              style={[styles.empty, { width: cardWidth, minHeight: cardHeight, borderColor: `${palette.tint}44` }]}>
              <ThemedText type="title">You’re through the deck</ThemedText>
              {comparisonUnavailable ? (
                <ThemedText style={{ color: palette.icon, textAlign: 'center' }}>No profiles available to compare yet</ThemedText>
              ) : compatibilityScore != null ? (
                <ThemedText type="title">Compatibility: {Math.round(compatibilityScore * 10) / 10}%</ThemedText>
              ) : null}
            </ThemedView>
          ) : atSwipeLimit ? (
            <ThemedView
              style={[styles.empty, { width: cardWidth, minHeight: cardHeight, borderColor: `${palette.tint}44` }]}>
              <ThemedText type="title">Swipe limit reached</ThemedText>
              <ThemedText style={{ color: palette.icon, textAlign: 'center' }}>
                You&apos;ve reached your swipe limit. Upgrade for unlimited swipes.
              </ThemedText>
            </ThemedView>
          ) : (
            <>
              {next ? (
                <SwipeCard
                  key={`back-${next.id}`}
                  kink={next}
                  onSwipeComplete={() => {}}
                  isTop={false}
                  gestureDisabled={false}
                  backScale={0.96}
                  cardWidth={cardWidth}
                  cardHeight={cardHeight}
                  swipeThreshold={swipeThreshold}
                  screenWidth={screenWidth}
                  screenHeight={screenHeight}
                  accent={palette.tint}
                  muted={palette.icon}
                />
              ) : null}
              <SwipeCard
                key={`top-${current.id}`}
                kink={current}
                onSwipeComplete={onSwipeComplete}
                isTop={true}
                gestureDisabled={atSwipeLimit}
                backScale={1}
                cardWidth={cardWidth}
                cardHeight={cardHeight}
                swipeThreshold={swipeThreshold}
                screenWidth={screenWidth}
                screenHeight={screenHeight}
                accent={palette.tint}
                muted={palette.icon}
              />
            </>
          )}
        </View>
      </ThemedView>
      {unlockToast != null ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.unlockToastOverlay,
            { paddingBottom: Math.max(insets.bottom, 8) + 4 },
          ]}>
          <View
            style={[
              styles.unlockToastInner,
              {
                backgroundColor: colorScheme === 'dark' ? 'rgba(40,40,44,0.94)' : 'rgba(28,28,30,0.94)',
                borderColor: `${palette.tint}44`,
              },
            ]}>
            <ThemedText style={styles.unlockToastTitle} lightColor="#fff" darkColor="#f5f5f7">
              New kinks unlocked 🔓
            </ThemedText>
            <ThemedText style={styles.unlockToastSubtitle} lightColor="rgba(255,255,255,0.82)" darkColor="rgba(245,245,247,0.82)">
              {unlockToast.count} new {unlockToast.count === 1 ? 'item' : 'items'} added
            </ThemedText>
          </View>
        </View>
      ) : null}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { flex: 1, paddingHorizontal: 20 },
  subheading: { fontSize: 14, marginBottom: 12 },
  compatibilityLive: { fontSize: 16, marginBottom: 8, textAlign: 'center' },
  comparisonFallback: { fontSize: 14, marginBottom: 8, textAlign: 'center' },
  swipeCount: { fontSize: 13, marginBottom: 4, textAlign: 'center' },
  limitBanner: { fontSize: 14, marginBottom: 8, textAlign: 'center' },
  deck: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { position: 'absolute', alignSelf: 'center' },
  cardInner: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 2,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardParentLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 6, opacity: 0.92 },
  cardTitle: { textAlign: 'center', marginBottom: 8 },
  cardHint: { fontSize: 14 },
  cardTapHintPressable: { alignSelf: 'stretch', paddingVertical: 4, marginBottom: 0 },
  cardTapHint: { fontSize: 13, fontStyle: 'italic', textAlign: 'center' },
  cardDescriptionWrap: {
    width: '100%',
    overflow: 'hidden',
  },
  cardDescriptionScroll: { width: '100%', maxHeight: DESCRIPTION_PANEL_MAX },
  cardDescriptionScrollContent: { paddingBottom: 4 },
  cardDescription: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  stamp: { position: 'absolute', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 3, backgroundColor: 'rgba(255,255,255,0.85)' },
  stampText: { fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  stampLeft: {
    left: '13%',
    top: '38%',
    transform: [{ rotate: '-12deg' }],
  },
  stampRight: {
    right: '13%',
    top: '38%',
    transform: [{ rotate: '12deg' }],
  },
  stampTop: { top: '14%', alignSelf: 'center' },
  stampBottom: { bottom: '14%', alignSelf: 'center' },
  empty: {
    borderRadius: 20,
    borderWidth: 2,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
  },
  unlockToastOverlay: {
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    zIndex: 100,
    elevation: 100,
  },
  unlockToastInner: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 4,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  unlockToastTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  unlockToastSubtitle: { fontSize: 13, textAlign: 'center' },
});
