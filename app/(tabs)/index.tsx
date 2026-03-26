import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { getUserKinkPreferences, initializeUserKinkPreferences, upsertUserKinkPreferences } from '@/lib/user-kink-preferences';

type KinkCategory = { id: number; label: string };
type SwipeDirection = 'no' | 'yes' | 'mood' | 'probablyNot';
type KinkSwipeResult = { kinkId: number; value: number };
type PreferenceValue = number | null;

const DEV_HARDCODED_MODE = true;

const KINK_CATEGORIES: KinkCategory[] = [
  { id: 1, label: 'Bondage & restraint' },
  { id: 2, label: 'Role play & fantasy' },
  { id: 3, label: 'Sensory play' },
  { id: 4, label: 'Power exchange (D/s)' },
];

const SWIPE_VALUES: Record<SwipeDirection, number> = { no: 0, yes: 100, mood: 67, probablyNot: 33 };
const SWIPE_LABELS: Record<SwipeDirection, string> = { no: 'NO', yes: 'YES', mood: 'MOOD', probablyNot: 'PROBABLY NOT' };
const HARDCODED_USER_B_PREFS: Map<number, PreferenceValue> = new Map([
  [1, 100],
  [2, 67],
  [3, 33],
  [4, 0],
  [5, 67],
  [6, 33],
  [7, 100],
  [8, 67],
  [9, 33],
  [10, 100],
  [11, 67],
  [12, 0],
]);

function categoryCompatibility(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return 100 - diff;
}

function overallCompatibility(aPrefs: Map<number, PreferenceValue>, bPrefs: Map<number, PreferenceValue>) {
  let sum = 0;
  let comparableCount = 0;
  for (const kink of KINK_CATEGORIES) {
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
}: {
  kink: KinkCategory;
  onSwipeComplete: (direction: SwipeDirection, kink: KinkCategory) => void;
  isTop: boolean;
  backScale: number;
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
    .enabled(isTop)
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
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [otherUserPrefs, setOtherUserPrefs] = useState<Map<number, PreferenceValue>>(new Map());
  const [compatibilityScore, setCompatibilityScore] = useState<number | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPrefsLoading(true);
      if (DEV_HARDCODED_MODE) {
        setCurrentUserId('dev-local-user');
        setOtherUserPrefs(HARDCODED_USER_B_PREFS);
        setAuthMessage('Using hardcoded dev users. Auth and DB writes are temporarily bypassed.');
        setPrefsLoading(false);
        return;
      }
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError && sessionError.message !== 'Auth session missing!') {
        console.error('Failed to get current Supabase session:', sessionError.message);
      }

      let user = sessionData.session?.user ?? null;
      if (!user) {
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError) {
          if (anonError.message === 'Anonymous sign-ins are disabled') {
            setAuthMessage('Enable anonymous auth in Supabase or sign in with a user account.');
          } else {
            console.error('Anonymous sign-in failed:', anonError.message);
          }
        }
        user = anonData.user ?? null;
      }

      if (!user) {
        if (!cancelled) setPrefsLoading(false);
        return;
      }

      const userId = user.id;
      setCurrentUserId(userId);
      setAuthMessage(null);
      await initializeUserKinkPreferences(userId, KINK_CATEGORIES.map((k) => k.id), null);
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
    if (!currentUserId || index !== KINK_CATEGORIES.length || hasSaved) return;
    if (DEV_HARDCODED_MODE) {
      setHasSaved(true);
      setSaveMessage('Dev mode: local profile saved (no database write).');
      return;
    }
    void (async () => {
      const ok = await upsertUserKinkPreferences(
        currentUserId,
        KINK_CATEGORIES.map((kink) => ({
          kinkId: kink.id,
          value: swipeResults.find((r) => r.kinkId === kink.id)?.value ?? null,
        })),
      );
      if (ok) {
        setHasSaved(true);
        setSaveMessage('Preferences saved.');
      } else {
        setSaveMessage('Save failed. Check console for Supabase error details.');
      }
    })();
  }, [index, swipeResults, hasSaved, currentUserId]);

  useEffect(() => {
    if (index !== KINK_CATEGORIES.length) return;
    const myPrefs = new Map<number, PreferenceValue>();
    for (const kink of KINK_CATEGORIES) {
      myPrefs.set(kink.id, swipeResults.find((r) => r.kinkId === kink.id)?.value ?? null);
    }
    const score = overallCompatibility(myPrefs, otherUserPrefs);
    setCompatibilityScore(score == null ? null : score);
    console.log('Compatibility', { score: score == null ? null : Math.round(score * 10) / 10 });
  }, [index, swipeResults, otherUserPrefs]);

  const onSwipeComplete = useCallback((direction: SwipeDirection, kink: KinkCategory) => {
    setSwipeResults((prev) => [...prev, { kinkId: kink.id, value: SWIPE_VALUES[direction] }]);
    setIndex((i) => i + 1);
  }, []);

  const current = KINK_CATEGORIES[index];
  const next = KINK_CATEGORIES[index + 1];

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemedView style={[styles.screen, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 12 }]}>
        <ThemedText type="subtitle">Your kink or mine</ThemedText>
        <ThemedText style={[styles.subheading, { color: palette.icon }]}>Left no · Right yes · Up mood · Down probably not</ThemedText>
        {authMessage ? <ThemedText style={[styles.subheading, { color: palette.icon }]}>{authMessage}</ThemedText> : null}
        {currentUserId == null ? (
          <ThemedText style={[styles.subheading, { color: palette.icon }]}>Sign in to save preferences.</ThemedText>
        ) : null}
        {saveMessage ? <ThemedText style={[styles.subheading, { color: palette.icon }]}>{saveMessage}</ThemedText> : null}
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
          ) : (
            <>
              {next ? (
                <SwipeCard
                  key={`back-${next.id}`}
                  kink={next}
                  onSwipeComplete={() => {}}
                  isTop={false}
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { flex: 1, paddingHorizontal: 20 },
  subheading: { fontSize: 14, marginBottom: 12 },
  deck: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { position: 'absolute', alignSelf: 'center' },
  cardInner: { flex: 1, borderRadius: 20, borderWidth: 2, padding: 24, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  cardTitle: { textAlign: 'center', marginBottom: 12 },
  cardHint: { fontSize: 14 },
  stamp: { position: 'absolute', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 3, backgroundColor: 'rgba(255,255,255,0.85)' },
  stampText: { fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  stampLeft: { left: 16, top: '40%', borderColor: '#c62828', transform: [{ rotate: '-12deg' }] },
  stampRight: { right: 16, top: '40%', borderColor: '#2e7d32', transform: [{ rotate: '12deg' }] },
  stampTop: { top: 20, alignSelf: 'center', borderColor: '#6a1b9a' },
  stampBottom: { bottom: 20, alignSelf: 'center', borderColor: '#ef6c00' },
  empty: { borderRadius: 20, borderWidth: 2, padding: 28, alignItems: 'center', justifyContent: 'center', gap: 8 },
});
