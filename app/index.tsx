import { Redirect } from 'expo-router';

import { useAuth } from '@/contexts/auth-context';

/**
 * Entry `/` — send users to auth or main tabs once session is hydrated from AsyncStorage.
 */
export default function Index() {
  const { session, initialized } = useAuth();

  if (!initialized) {
    return null;
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)" />;
}
