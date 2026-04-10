import { formatAuthError } from '@/lib/format-auth-error';
import { supabase } from '@/lib/supabase';

/** Returns the current user id, signing in anonymously if needed (when enabled in Supabase). */
export async function ensureSignedInUserId(): Promise<string | null> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError && sessionError.message !== 'Auth session missing!') {
    console.error('Failed to get current Supabase session:', formatAuthError(sessionError));
  }
  let user = sessionData.session?.user ?? null;
  if (!user) {
    const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
    if (anonError) {
      console.error('Anonymous sign-in failed:', formatAuthError(anonError));
      return null;
    }
    user = anonData.user ?? null;
  }
  return user?.id ?? null;
}
