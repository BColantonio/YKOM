import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { fetchProfileByUserId, type Profile } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  initialized: boolean;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
  signUp: (params: {
    email: string;
    password: string;
    username?: string;
  }) => Promise<{ error: Error | null; needsEmailConfirmation: boolean }>;
  signIn: (params: { email: string; password: string }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signInAnonymously: () => Promise<{ error: Error | null }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const user = session?.user ?? null;

  const refreshProfile = useCallback(async () => {
    const uid = session?.user?.id;
    if (!uid) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    const row = await fetchProfileByUserId(uid);
    setProfile(row);
    setProfileLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!cancelled) {
        setSession(s);
        setInitialized(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const signUp = useCallback(async (params: { email: string; password: string; username?: string }) => {
    const { email, password, username } = params;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      ...(username?.trim()
        ? { options: { data: { username: username.trim() } } }
        : {}),
    });

    if (error) {
      return { error: error as Error, needsEmailConfirmation: false };
    }

    const needsEmailConfirmation = !data.session && !!data.user;
    return { error: null, needsEmailConfirmation };
  }, []);

  const signIn = useCallback(async (params: { email: string; password: string }) => {
    const { error } = await supabase.auth.signInWithPassword(params);
    return { error: error as Error | null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const signInAnonymously = useCallback(async () => {
    const { error } = await supabase.auth.signInAnonymously();
    return { error: error as Error | null };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      initialized,
      profileLoading,
      refreshProfile,
      signUp,
      signIn,
      signOut,
      signInAnonymously,
    }),
    [
      session,
      user,
      profile,
      initialized,
      profileLoading,
      refreshProfile,
      signUp,
      signIn,
      signOut,
      signInAnonymously,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
