import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConnectionCard, type PlaceholderCompatibility } from '@/components/connection-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFollows } from '@/hooks/use-follows';
import { updateProfileUsername } from '@/lib/profiles';
import {
  fetchUserPreferencesGroupedByCategory,
  type GroupedKinkPreference,
  type GroupedKinkPreferencesByCategory,
} from '@/lib/grouped-kink-preferences';
import {
  EDIT_OPTIONS,
  preferenceValueToShortLabel,
  type StoredPreferenceValue,
} from '@/lib/kink-preference-values';
import { upsertUserKinkPreferences } from '@/lib/user-kink-preferences';

/** Profile lists only kinks the user has committed (saved value: 0, 33, 67, or 100). */
function placeholderCompatibilityForRow(index: number): PlaceholderCompatibility {
  const presets: PlaceholderCompatibility[] = [
    { label: '92%', badgeColor: '#2e7d32' },
    { label: '76%', badgeColor: '#f9a825' },
    { label: '45%', badgeColor: '#e65100' },
  ];
  return presets[index % presets.length] ?? { label: '––%', badgeColor: '#888888' };
}

function preferencesWithCompletedSwipesOnly(
  sections: GroupedKinkPreferencesByCategory[],
): GroupedKinkPreferencesByCategory[] {
  return sections
    .map((section) => ({
      ...section,
      kinks: section.kinks.filter((k) => k.value != null),
    }))
    .filter((section) => section.kinks.length > 0);
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile, initialized, profileLoading, refreshProfile, signOut } = useAuth();

  const userId = user?.id ?? null;
  const authLoading = !initialized;

  const [prefsLoading, setPrefsLoading] = useState(false);
  const [grouped, setGrouped] = useState<GroupedKinkPreferencesByCategory[]>([]);
  const [editing, setEditing] = useState<GroupedKinkPreference | null>(null);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState('');
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

  const loadPreferences = useCallback(async () => {
    if (!userId) return;
    setPrefsLoading(true);
    const data = await fetchUserPreferencesGroupedByCategory(userId);
    setGrouped(preferencesWithCompletedSwipesOnly(data));
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

  const { follows: followedPeople, loading: followsLoading } = useFollows(userId);

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

  const onSaveUsername = useCallback(async () => {
    if (!userId) return;
    const ok = await updateProfileUsername(userId, usernameDraft);
    setProfileEditOpen(false);
    if (ok) {
      void refreshProfile();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Alert.alert('Couldn’t update username', 'Try a different name — it might already be taken.');
    }
  }, [userId, usernameDraft, refreshProfile]);

  const onSignOut = useCallback(async () => {
    await signOut();
    router.replace('/(auth)');
  }, [signOut, router]);

  const displayName =
    profile?.username ?? user?.user_metadata?.username ?? user?.email?.split('@')[0] ?? 'Explorer';
  const isGuest = user?.is_anonymous === true;

  return (
    <ThemedView style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ThemedText type="title" style={styles.title}>
          Profile
        </ThemedText>

        <View style={styles.headerBlock}>
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.avatar}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: palette.icon + '33' }]} />
          )}
          <ThemedText type="subtitle" style={styles.username}>
            {profileLoading ? '…' : displayName}
          </ThemedText>
          {isGuest ? (
            <ThemedText style={[styles.bio, { color: palette.icon }]}>
              You&apos;re browsing as a guest — swipe away, or create an account to save your vibe across devices.
            </ThemedText>
          ) : (
            <ThemedText style={[styles.bio, { color: palette.icon }]}>
              {user?.email ?? 'Signed in'} · Tap Edit to rename your playful handle.
            </ThemedText>
          )}
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.outlineButton, { borderColor: palette.tint }]}
              onPress={() => {
                setUsernameDraft(profile?.username ?? displayName);
                setProfileEditOpen(true);
              }}
              accessibilityRole="button">
              <ThemedText type="defaultSemiBold">Edit Profile</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.outlineButton, { borderColor: palette.tint }]}
              onPress={() => {}}
              accessibilityRole="button">
              <ThemedText type="defaultSemiBold">Share Profile</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.outlineButton, { borderColor: palette.icon + '88' }]}
              onPress={() => void onSignOut()}
              accessibilityRole="button">
              <ThemedText type="defaultSemiBold">Sign out</ThemedText>
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

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Your People
        </ThemedText>
        <ThemedText style={[styles.yourPeopleSubtitle, { color: palette.icon }]}>
          People you follow • See how your kinks match
        </ThemedText>

        {authLoading ? null : userId == null ? (
          <ThemedText style={{ color: palette.icon }}>Sign in to see people you follow.</ThemedText>
        ) : followsLoading ? (
          <ActivityIndicator size="small" color={palette.tint} />
        ) : followedPeople.length === 0 ? (
          <ThemedView style={styles.yourPeopleEmpty}>
            <ThemedText style={[styles.yourPeopleEmptyText, { color: palette.icon }]}>
              You&apos;re not following anyone yet.
            </ThemedText>
            <Pressable
              style={[styles.outlineButton, styles.followMoreButton, { borderColor: palette.tint }]}
              onPress={() => {
                console.log('Navigate to discover');
              }}
              accessibilityRole="button">
              <ThemedText type="defaultSemiBold">Discover people</ThemedText>
            </Pressable>
          </ThemedView>
        ) : (
          followedPeople.map((row, index) => (
            <ConnectionCard
              key={row.followRowId}
              row={row}
              palette={palette}
              compatibility={placeholderCompatibilityForRow(index)}
            />
          ))
        )}
      </ScrollView>

      <Modal visible={profileEditOpen} transparent animationType="fade" onRequestClose={() => setProfileEditOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setProfileEditOpen(false)}>
          <Pressable
            style={[styles.modalCard, { borderColor: palette.icon + '44', backgroundColor: palette.background }]}
            onPress={(e) => e.stopPropagation()}>
            <ThemedText type="defaultSemiBold" style={styles.modalTitle}>
              Username
            </ThemedText>
            <TextInput
              value={usernameDraft}
              onChangeText={setUsernameDraft}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="curious_kitten"
              placeholderTextColor={palette.icon}
              style={[
                styles.usernameInput,
                { color: palette.text, borderColor: palette.icon + '55', backgroundColor: palette.background },
              ]}
            />
            <Pressable style={styles.modalOption} onPress={() => void onSaveUsername()}>
              <ThemedText type="defaultSemiBold" style={{ color: palette.tint }}>
                Save
              </ThemedText>
            </Pressable>
            <Pressable style={styles.modalCancel} onPress={() => setProfileEditOpen(false)}>
              <ThemedText style={{ color: palette.icon }}>Cancel</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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
  buttonRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  usernameInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
    marginBottom: 8,
  },
  outlineButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sectionTitle: { marginTop: 8, marginBottom: 4 },
  yourPeopleSubtitle: { fontSize: 13, lineHeight: 18, marginBottom: 10, marginTop: -2 },
  yourPeopleEmpty: { gap: 12, marginBottom: 8 },
  yourPeopleEmptyText: { fontSize: 14, lineHeight: 20 },
  followMoreButton: { alignSelf: 'flex-start' },
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
