import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getUnlockKinksForParentId, type DeckKink } from '@/lib/deck-unlock';
import { formatAuthError } from '@/lib/format-auth-error';
import { baseDeckCategories } from '@/lib/local-kinks';
import { supabase } from '@/lib/supabase';
import { SWIPE_LABELS, SWIPE_VALUES, type SwipeDirection } from '@/lib/kink-preference-values';
import { SWIPE_LIMIT } from '@/lib/swipe-limit';
import { getUserKinkPreferences, initializeUserKinkPreferences, upsertUserKinkPreferences } from '@/lib/user-kink-preferences';

type KinkCategory = DeckKink;
type KinkSwipeResult = { kinkId: number; value: number };
type PreferenceValue = number | null;

const DEV_HARDCODED_MODE = true;

/**
 * Local deck (not fetched from DB). Canonical export: {@link BASE_KINKS} from `@/lib/base-kinks`.
 * ```
 * { id: 1, name: 'bondage' },
 * { id: 2, name: 'roleplay' },
 * { id: 3, name: 'public play' },
 * { id: 4, name: 'voyeurism' },
 * ```
 */
export { BASE_KINKS } from '@/lib/base-kinks';
function categoryCompatibility(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return 100 - diff;
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

async function fetchOtherUserPreferences(excludeUserId: string) {
  const { data, error } = await supabase
    .from('user_kink_preferences')
    .select('user_id,updated_at')
    .neq('user_id', excludeUserId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('Failed to fetch other user:', error.message);
    return null;
  }
  if (!data?.user_id) return null;
  return { userId: data.user_id, prefs: await getUserKinkPreferences(data.user_id) };
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
  cardHeight: number;
  swipeThreshold: number;
  screenWidth: number;
  screenHeight: number;
  accent: string;
  muted: string;
}) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  const finishSwipe = useCallback(
    (direction: SwipeDirection) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSwipeComplete(direction, kink);
    },
    [onSwipeComplete, kink],
  );

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

  const noOverlay = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-swipeThreshold * 1.5, 0], [1, 0]) }));
  const yesOverlay = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, swipeThreshold * 1.5], [0, 1]) }));
  const moodOverlay = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [-swipeThreshold * 1.5, 0], [1, 0]) }));
  const maybeOverlay = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, swipeThreshold * 1.5], [0, 1]) }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, { width: cardWidth, height: cardHeight, zIndex: isTop ? 2 : 1 }, cardStyle]}>
        <ThemedView style={[styles.cardInner, { borderColor: `${accent}55` }]}>
          {kink.parentLabel ? (
            <ThemedText style={[styles.cardParentLabel, { color: muted }]} numberOfLines={2}>
              {kink.parentLabel}
            </ThemedText>
          ) : null}
          <ThemedText type="title" style={styles.cardTitle}>
            {kink.label}
          </ThemedText>
          <ThemedText style={[styles.cardHint, { color: muted }]}>Swipe to decide</ThemedText>

          <Animated.View style={[styles.stamp, styles.stampLeft, noOverlay]}>
            <ThemedText style={[styles.stampText, { color: '#c62828' }]}>{SWIPE_LABELS.no}</ThemedText>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.stampRight, yesOverlay]}>
            <ThemedText style={[styles.stampText, { color: '#2e7d32' }]}>{SWIPE_LABELS.yes}</ThemedText>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.stampTop, moodOverlay]}>
            <ThemedText style={[styles.stampText, { color: '#6a1b9a' }]}>{SWIPE_LABELS.mood}</ThemedText>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.stampBottom, maybeOverlay]}>
            <ThemedText style={[styles.stampText, { color: '#ef6c00' }]}>{SWIPE_LABELS.probablyNot}</ThemedText>
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
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const swipeThreshold = useMemo(() => Math.min(120, screenWidth * 0.22), [screenWidth]);
  const cardWidth = useMemo(() => Math.min(screenWidth * 0.9, 400), [screenWidth]);
  const cardHeight = useMemo(() => Math.min(340, screenHeight * 0.42), [screenHeight]);

  const [index, setIndex] = useState(0);
  const [swipeResults, setSwipeResults] = useState<KinkSwipeResult[]>([]);
  const [kinkCategories, setKinkCategories] = useState<KinkCategory[]>([]);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [otherUserPrefs, setOtherUserPrefs] = useState<Map<number, PreferenceValue>>(new Map());
  const [compatibilityScore, setCompatibilityScore] = useState<number | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [swipesUsed, setSwipesUsed] = useState(0);
  const [unlockToast, setUnlockToast] = useState<{ count: number } | null>(null);
  const unlockToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deckRef = useRef<KinkCategory[]>([]);
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
    let cancelled = false;
    (async () => {
      setPrefsLoading(true);
      const deck = baseDeckCategories();
      if (!cancelled) setKinkCategories(deck);
      if (deck.length === 0) {
        setAuthMessage('No kinks defined in the local deck.');
        setPrefsLoading(false);
        return;
      }
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
        await initializeUserKinkPreferences(user.id, deck.map((k) => k.id), null);
        const loaded = await fetchOtherUserPreferences(user.id);
        setOtherUserPrefs(loaded?.prefs ?? new Map());
        setAuthMessage('Dev mode: using anonymous users. Tap switch to create/use another test user.');
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
      await initializeUserKinkPreferences(userId, deck.map((k) => k.id), null);
      const loaded = await fetchOtherUserPreferences(userId);
      if (cancelled) return;
      setOtherUserPrefs(loaded?.prefs ?? new Map());
      setPrefsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        fetched = getUnlockKinksForParentId(kink.id);
      }

      const prev = deckRef.current;
      const pos = prev.findIndex((k) => k.id === kink.id);
      const ids = new Set(prev.map((k) => k.id));
      const unique = fetched.filter((u) => !ids.has(u.id));
      if (unique.length > 0 && pos >= 0) {
        const nextDeck = [...prev.slice(0, pos + 1), ...unique, ...prev.slice(pos + 1)];
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
    [swipesUsed, currentUserId, showUnlockToast],
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
        {DEV_HARDCODED_MODE ? (
          <Pressable
            style={[styles.switchButton, { borderColor: palette.tint }]}
            onPress={async () => {
              await supabase.auth.signOut();
              const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
              if (anonError || !anonData.user) {
                setAuthMessage(
                  anonError ? `Failed to switch test user: ${formatAuthError(anonError)}` : 'Failed to switch test user.',
                );
                return;
              }
              const newUserId = anonData.user.id;
              await initializeUserKinkPreferences(newUserId, kinkCategories.map((k) => k.id), null);
              const loaded = await fetchOtherUserPreferences(newUserId);
              setCurrentUserId(newUserId);
              setOtherUserPrefs(loaded?.prefs ?? new Map());
              setIndex(0);
              setSwipeResults([]);
              setCompatibilityScore(null);
              setHasSaved(false);
              setSaveMessage(null);
              setSwipesUsed(0);
              setAuthMessage('Switched to another anonymous test user.');
            }}>
            <ThemedText>Switch test user</ThemedText>
          </Pressable>
        ) : null}
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
        {currentUserId != null && !prefsLoading && current != null && compatibilityScore != null ? (
          <ThemedText type="defaultSemiBold" style={[styles.compatibilityLive, { color: palette.tint }]}>
            Compatibility: {Math.round(compatibilityScore * 10) / 10}%
          </ThemedText>
        ) : null}
        <View style={styles.deck}>
          {prefsLoading ? (
            <ActivityIndicator size="large" color={palette.tint} />
          ) : currentUserId == null ? (
            <ThemedView style={[styles.empty, { width: cardWidth, borderColor: `${palette.tint}44` }]}>
              <ThemedText type="title">Authentication required</ThemedText>
              <ThemedText style={{ color: palette.icon, textAlign: 'center' }}>
                Sign in (or enable anonymous auth) before swiping so preferences can be saved.
              </ThemedText>
            </ThemedView>
          ) : current == null ? (
            <ThemedView style={[styles.empty, { width: cardWidth, borderColor: `${palette.tint}44` }]}>
              <ThemedText type="title">You’re through the deck</ThemedText>
              {compatibilityScore != null ? <ThemedText type="title">Compatibility: {Math.round(compatibilityScore * 10) / 10}%</ThemedText> : null}
            </ThemedView>
          ) : atSwipeLimit ? (
            <ThemedView style={[styles.empty, { width: cardWidth, borderColor: `${palette.tint}44` }]}>
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
  swipeCount: { fontSize: 13, marginBottom: 4, textAlign: 'center' },
  limitBanner: { fontSize: 14, marginBottom: 8, textAlign: 'center' },
  switchButton: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start', marginBottom: 8 },
  deck: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { position: 'absolute', alignSelf: 'center' },
  cardInner: { flex: 1, borderRadius: 20, borderWidth: 2, padding: 24, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  cardParentLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 6, opacity: 0.92 },
  cardTitle: { textAlign: 'center', marginBottom: 12 },
  cardHint: { fontSize: 14 },
  stamp: { position: 'absolute', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 3, backgroundColor: 'rgba(255,255,255,0.85)' },
  stampText: { fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  stampLeft: { left: 16, top: '40%', borderColor: '#c62828', transform: [{ rotate: '-12deg' }] },
  stampRight: { right: 16, top: '40%', borderColor: '#2e7d32', transform: [{ rotate: '12deg' }] },
  stampTop: { top: 20, alignSelf: 'center', borderColor: '#6a1b9a' },
  stampBottom: { bottom: 20, alignSelf: 'center', borderColor: '#ef6c00' },
  empty: { borderRadius: 20, borderWidth: 2, padding: 28, alignItems: 'center', justifyContent: 'center', gap: 8 },
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
