import { supabase } from '@/lib/supabase';
import { getKinkLabelById } from '@/lib/local-kinks';

export type GroupedKinkPreference = {
  kinkId: number;
  kinkName: string;
  value: number | null;
};

export type GroupedKinkPreferencesByCategory = {
  categoryName: string;
  kinks: GroupedKinkPreference[];
};

const PROFILE_CATEGORY = 'Your kinks';

/** Loads preferences from Supabase; kink names come from the local registry (no `kinks` table fetch). */
export async function fetchUserPreferencesGroupedByCategory(
  userId: string,
): Promise<GroupedKinkPreferencesByCategory[]> {
  const { data: prefRows, error: prefError } = await supabase
    .from('user_kink_preferences')
    .select('kink_id, value')
    .eq('user_id', userId);

  if (prefError) {
    console.error('Failed to fetch user kink preferences:', prefError.message);
    return [];
  }
  if (!prefRows?.length) return [];

  const kinks: GroupedKinkPreference[] = [];
  for (const row of prefRows) {
    const name = getKinkLabelById(row.kink_id);
    if (!name) continue;
    kinks.push({
      kinkId: row.kink_id,
      kinkName: name,
      value: typeof row.value === 'number' ? row.value : null,
    });
  }

  kinks.sort((a, b) => a.kinkName.localeCompare(b.kinkName));

  return [{ categoryName: PROFILE_CATEGORY, kinks }];
}
