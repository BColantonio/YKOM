import { supabase } from '@/lib/supabase';

export type UserKinkPreference = {
  kinkId: number;
  value: number | null;
};

export async function getUserKinkPreferences(userId: string): Promise<Map<number, number | null>> {
  const { data, error } = await supabase
    .from('user_kink_preferences')
    .select('kink_id,value')
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to fetch user kink preferences:', error.message);
    return new Map();
  }

  const prefs = new Map<number, number | null>();
  for (const row of data ?? []) {
    if (typeof row.kink_id !== 'number') continue;
    prefs.set(row.kink_id, typeof row.value === 'number' ? row.value : null);
  }
  return prefs;
}

export async function upsertUserKinkPreferences(userId: string, preferences: UserKinkPreference[]) {
  if (preferences.length === 0) return;

  const payload = preferences.map((pref) => ({
    user_id: userId,
    kink_id: pref.kinkId,
    value: pref.value,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('user_kink_preferences')
    .upsert(payload, { onConflict: 'user_id,kink_id' });

  if (error) {
    console.error('Failed to upsert user kink preferences:', error.message);
    return false;
  }
  return true;
}

export async function initializeUserKinkPreferences(userId: string, kinkIds: number[], defaultValue: number | null = null) {
  if (kinkIds.length === 0) return;

  const payload = kinkIds.map((kinkId) => ({
    user_id: userId,
    kink_id: kinkId,
    value: defaultValue,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('user_kink_preferences')
    .upsert(payload, { onConflict: 'user_id,kink_id', ignoreDuplicates: true });

  if (error) {
    console.error('Failed to initialize user kink preferences:', error.message);
  }
}
