import { supabase } from '@/lib/supabase';

export type UserKinkPreference = {
  kinkId: number;
  value: number | null;
};

/** Drops ids not present in `public.kinks` so upserts satisfy user_kink_preferences_kink_fk. */
async function filterExistingKinkIds(kinkIds: number[]): Promise<number[]> {
  const unique = [...new Set(kinkIds)];
  if (unique.length === 0) return [];

  const { data, error } = await supabase.from('kinks').select('id').in('id', unique);

  if (error) {
    console.error('filterExistingKinkIds:', error.message);
    return [];
  }

  const found = new Set((data ?? []).map((r) => r.id as number));
  return unique.filter((id) => found.has(id));
}

/**
 * Finds the other user whose preferences were updated most recently (max per-user `updated_at`),
 * then loads their full preference map. Excludes `excludeUserId`.
 */
export async function fetchMostRecentComparisonUserPreferences(
  excludeUserId: string,
): Promise<{ userId: string; prefs: Map<number, number | null> } | null> {
  const { data, error } = await supabase
    .from('user_kink_preferences')
    .select('user_id, updated_at')
    .neq('user_id', excludeUserId);

  if (error) {
    console.error('fetchMostRecentComparisonUserPreferences:', error.message);
    return null;
  }
  if (!data?.length) return null;

  const latestByUser = new Map<string, string>();
  for (const row of data) {
    const uid = String(row.user_id);
    const t = row.updated_at as string | undefined;
    if (!t) continue;
    const prev = latestByUser.get(uid);
    if (!prev || t > prev) latestByUser.set(uid, t);
  }
  if (latestByUser.size === 0) return null;

  let bestUserId: string | null = null;
  let bestTime = '';
  for (const [uid, t] of latestByUser) {
    if (t > bestTime) {
      bestTime = t;
      bestUserId = uid;
    }
  }
  if (!bestUserId) return null;

  const prefs = await getUserKinkPreferences(bestUserId);
  return { userId: bestUserId, prefs };
}

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

  const validIds = new Set(await filterExistingKinkIds(preferences.map((p) => p.kinkId)));
  const filtered = preferences.filter((p) => validIds.has(p.kinkId));
  if (filtered.length === 0) return;
  if (filtered.length < preferences.length) {
    console.warn('upsertUserKinkPreferences: skipping unknown kink ids');
  }

  const payload = filtered.map((pref) => ({
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

  const valid = await filterExistingKinkIds(kinkIds);
  if (valid.length === 0) return;
  if (valid.length < kinkIds.length) {
    console.warn('initializeUserKinkPreferences: skipping unknown kink ids');
  }

  const payload = valid.map((kinkId) => ({
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
