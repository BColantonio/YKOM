import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatAuthError } from '@/lib/format-auth-error';

type Mode = 'signin' | 'signup';

export default function AuthScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, signUp, signInAnonymously } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);

  const goTabs = useCallback(() => {
    router.replace('/(tabs)');
  }, [router]);

  const onSignIn = useCallback(async () => {
    const e = email.trim();
    if (!e || !password) {
      Alert.alert('Almost there', 'Enter email and password.');
      return;
    }
    setBusy(true);
    const { error } = await signIn({ email: e, password });
    setBusy(false);
    if (error) {
      Alert.alert('Sign in failed', formatAuthError(error));
      return;
    }
    goTabs();
  }, [email, password, signIn, goTabs]);

  const onSignUp = useCallback(async () => {
    const e = email.trim();
    if (!e || !password) {
      Alert.alert('Almost there', 'Enter email and password.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords', 'Passwords don’t match yet — give them another try.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password', 'Use at least 6 characters.');
      return;
    }
    setBusy(true);
    const { error, needsEmailConfirmation } = await signUp({
      email: e,
      password,
      username: username.trim() || undefined,
    });
    setBusy(false);
    if (error) {
      Alert.alert('Sign up failed', formatAuthError(error));
      return;
    }
    if (needsEmailConfirmation) {
      Alert.alert(
        'Check your inbox',
        'We sent a confirmation link — tap it to finish signing up, then come back and sign in.',
      );
      setMode('signin');
      return;
    }
    Alert.alert('Welcome to YKOM', 'Your playful profile is ready. Explore safely and have fun.');
    goTabs();
  }, [email, password, confirmPassword, username, signUp, goTabs]);

  const onGuest = useCallback(async () => {
    setBusy(true);
    const { error } = await signInAnonymously();
    setBusy(false);
    if (error) {
      Alert.alert('Guest mode', formatAuthError(error));
      return;
    }
    goTabs();
  }, [signInAnonymously, goTabs]);

  return (
    <ThemedView style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ThemedText type="title" style={styles.heroTitle}>
            Your Kink or Mine
          </ThemedText>
          <ThemedText style={[styles.tagline, { color: palette.icon }]}>
            Explore desires with consent, curiosity, and a little mischief — sign in or slide in as a guest.
          </ThemedText>

          <View style={styles.modeRow}>
            <Pressable
              onPress={() => setMode('signin')}
              style={[styles.modeChip, mode === 'signin' && { borderColor: palette.tint, backgroundColor: palette.tint + '22' }]}>
              <ThemedText type="defaultSemiBold">Sign in</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setMode('signup')}
              style={[styles.modeChip, mode === 'signup' && { borderColor: palette.tint, backgroundColor: palette.tint + '22' }]}>
              <ThemedText type="defaultSemiBold">Sign up</ThemedText>
            </Pressable>
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Email</ThemedText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="you@example.com"
              placeholderTextColor={palette.icon}
              style={[styles.input, { color: palette.text, borderColor: palette.icon + '55' }]}
            />
          </View>

          {mode === 'signup' ? (
            <View style={styles.field}>
              <ThemedText style={styles.label}>Username (optional)</ThemedText>
              <TextInput
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholder="e.g. curious_kitten"
                placeholderTextColor={palette.icon}
                style={[styles.input, { color: palette.text, borderColor: palette.icon + '55' }]}
              />
              <ThemedText style={[styles.hint, { color: palette.icon }]}>
                Or we’ll give you a playful random name — you can change it later.
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.field}>
            <ThemedText style={styles.label}>Password</ThemedText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={palette.icon}
              style={[styles.input, { color: palette.text, borderColor: palette.icon + '55' }]}
            />
          </View>

          {mode === 'signup' ? (
            <View style={styles.field}>
              <ThemedText style={styles.label}>Confirm password</ThemedText>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={palette.icon}
                style={[styles.input, { color: palette.text, borderColor: palette.icon + '55' }]}
              />
            </View>
          ) : null}

          <Pressable
            disabled={busy}
            onPress={() => void (mode === 'signin' ? onSignIn() : onSignUp())}
            style={[styles.primaryButton, { backgroundColor: palette.tint, opacity: busy ? 0.7 : 1 }]}
            accessibilityRole="button">
            <ThemedText
              type="defaultSemiBold"
              style={[styles.primaryButtonText, { color: colorScheme === 'dark' ? '#151718' : '#fff' }]}>
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </ThemedText>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: palette.icon + '44' }]} />
            <ThemedText style={[styles.dividerText, { color: palette.icon }]}>or</ThemedText>
            <View style={[styles.divider, { backgroundColor: palette.icon + '44' }]} />
          </View>

          <Pressable
            disabled={busy}
            onPress={() => void onGuest()}
            style={[styles.outlineButton, { borderColor: palette.tint }]}
            accessibilityRole="button">
            <ThemedText type="defaultSemiBold">Continue as Guest</ThemedText>
          </Pressable>
          <ThemedText style={[styles.guestHint, { color: palette.icon }]}>
            Guest mode keeps the swipe deck and unlocks — great for trying the vibe without an account.
          </ThemedText>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  flex: { flex: 1 },
  scroll: { paddingBottom: 32, gap: 14 },
  heroTitle: { textAlign: 'center', marginBottom: 8 },
  tagline: { textAlign: 'center', fontSize: 15, lineHeight: 22, marginBottom: 8 },
  modeRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 8 },
  modeChip: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#8884',
  },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  hint: { fontSize: 12, lineHeight: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {},
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 },
  divider: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 13 },
  outlineButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  guestHint: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
