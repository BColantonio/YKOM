import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Collapsible } from '@/components/ui/collapsible';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ensureSignedInUserId } from '@/lib/auth-session';
import {
  EDIT_OPTIONS,
  preferenceValueToShortLabel,
  type StoredPreferenceValue,
} from '@/lib/kink-preference-values';
import {
  fetchUserPreferencesGroupedByCategory,
  type GroupedKinkPreference,
  type GroupedKinkPreferencesByCategory,
} from '@/lib/grouped-kink-preferences';
import { upsertUserKinkPreferences } from '@/lib/user-kink-preferences';

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [grouped, setGrouped] = useState<GroupedKinkPreferencesByCategory[]>([]);
  const [editing, setEditing] = useState<GroupedKinkPreference | null>(null);
  const [savedFlashKinkId, setSavedFlashKinkId] = useState<number | null>(null);
  const saveFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashSaveFeedback = useCallback((kinkId: number) => {
    if (saveFlashTimerRef.current) clearTimeout(saveFlashTimerRef.current);
    setSavedFlashKinkId(kinkId);
    saveFlashTimerRef.current = setTimeout(() => {
      setSavedFlashKinkId(null);
      saveFlashTimerRef.current = null;
    }, 1200);
  }, []);

  useEffect(
    () => () => {
      if (saveFlashTimerRef.current) clearTimeout(saveFlashTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setAuthLoading(true);
      const id = await ensureSignedInUserId();
      if (!cancelled) {
        setUserId(id);
        setAuthLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadPreferences = useCallback(async () => {
    if (!userId) return;
    setPrefsLoading(true);
    const data = await fetchUserPreferencesGroupedByCategory(userId);
    setGrouped(data);
    setPrefsLoading(false);
  }, [userId]);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  useFocusEffect(
    useCallback(() => {
      void loadPreferences();
    }, [loadPreferences]),
  );

  const updateKinkLocal = useCallback((kinkId: number, value: StoredPreferenceValue) => {
    setGrouped((prev) =>
      prev.map((g) => ({
        ...g,
        kinks: g.kinks.map((k) => (k.kinkId === kinkId ? { ...k, value } : k)),
      })),
    );
  }, []);

  const onPickValue = useCallback(
    async (value: number) => {
      if (!userId || !editing) return;
      const kinkId = editing.kinkId;
      const ok = await upsertUserKinkPreferences(userId, [{ kinkId, value }]);
      setEditing(null);
      if (ok) {
        updateKinkLocal(kinkId, value);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        flashSaveFeedback(kinkId);
      }
    },
    [userId, editing, updateKinkLocal, flashSaveFeedback],
  );

  return (
    <ThemedView style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ThemedText type="title" style={styles.title}>
          Profile
        </ThemedText>

        <View style={styles.headerBlock}>
          <View style={[styles.avatar, { backgroundColor: palette.icon + '33' }]} />
          <ThemedText type="subtitle" style={styles.username}>
            username
          </ThemedText>
          <ThemedText style={[styles.bio, { color: palette.icon }]}>
            Short bio goes here. Tap Edit Profile to change this later.
          </ThemedText>
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.outlineButton, { borderColor: palette.tint }]}
              onPress={() => {}}
              accessibilityRole="button">
              <ThemedText type="defaultSemiBold">Edit Profile</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.outlineButton, { borderColor: palette.tint }]}
              onPress={() => {}}
              accessibilityRole="button">
              <ThemedText type="defaultSemiBold">Share Profile</ThemedText>
            </Pressable>
          </View>
        </View>

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Preferences
        </ThemedText>

        {authLoading ? (
          <ActivityIndicator size="small" color={palette.tint} />
        ) : userId == null ? (
          <ThemedText style={{ color: palette.icon }}>Sign in to load preferences.</ThemedText>
        ) : prefsLoading ? (
          <ActivityIndicator size="small" color={palette.tint} />
        ) : grouped.length === 0 ? (
          <ThemedText style={{ color: palette.icon }}>No saved preferences yet.</ThemedText>
        ) : (
          grouped.map((section) => (
            <Collapsible key={section.categoryName} title={section.categoryName}>
              {section.kinks.map((k) => {
                const isFlash = savedFlashKinkId === k.kinkId;
                return (
                  <Pressable
                    key={k.kinkId}
                    style={[
                      styles.kinkRow,
                      isFlash && {
                        backgroundColor: palette.tint + '26',
                        borderRadius: 8,
                        marginHorizontal: -6,
                        paddingHorizontal: 6,
                      },
                    ]}
                    onPress={() => setEditing(k)}
                    accessibilityRole="button">
                    <ThemedText style={styles.kinkName} numberOfLines={2}>
                      {k.kinkName}
                    </ThemedText>
                    <View style={styles.kinkRowRight}>
                      {isFlash ? (
                        <ThemedText style={[styles.savedHint, { color: palette.icon }]}>Saved</ThemedText>
                      ) : null}
                      <ThemedText type="defaultSemiBold" style={{ color: palette.tint }}>
                        {preferenceValueToShortLabel(k.value)}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })}
            </Collapsible>
          ))
        )}
      </ScrollView>

      <Modal visible={editing != null} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setEditing(null)}>
          <Pressable
            style={[styles.modalCard, { borderColor: palette.icon + '44', backgroundColor: palette.background }]}
            onPress={(e) => e.stopPropagation()}>
            <ThemedText type="defaultSemiBold" style={styles.modalTitle} numberOfLines={2}>
              {editing?.kinkName}
            </ThemedText>
            {EDIT_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={styles.modalOption}
                onPress={() => void onPickValue(opt.value)}>
                <ThemedText style={styles.modalOptionText}>{opt.label}</ThemedText>
              </Pressable>
            ))}
            <Pressable style={styles.modalCancel} onPress={() => setEditing(null)}>
              <ThemedText style={{ color: palette.icon }}>Cancel</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16 },
  scroll: { paddingBottom: 24, gap: 12 },
  title: { marginBottom: 4 },
  headerBlock: { gap: 8, marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignSelf: 'center' },
  username: { textAlign: 'center' },
  bio: { textAlign: 'center', fontSize: 14, lineHeight: 20 },
  buttonRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 4 },
  outlineButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sectionTitle: { marginTop: 8, marginBottom: 4 },
  kinkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#8884',
  },
  kinkName: { flex: 1 },
  kinkRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  savedHint: { fontSize: 12, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  modalTitle: { marginBottom: 8 },
  modalOption: { paddingVertical: 12 },
  modalOptionText: { flexShrink: 1 },
  modalCancel: { paddingVertical: 12, marginTop: 4, alignItems: 'center' },
});
