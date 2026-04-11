import { supabase } from '@/lib/supabase';
import { buildKinkIdMap, fetchAllKinks, type Kink } from '@/lib/kinks';

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

/** Loads preferences from Supabase; pass `kinkList` from cache to avoid a second `kinks` fetch. */
export async function fetchUserPreferencesGroupedByCategory(
  userId: string,
  kinkList?: Kink[],
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

  const list = kinkList?.length ? kinkList : await fetchAllKinks();
  const byId = buildKinkIdMap(list);

  const kinks: GroupedKinkPreference[] = [];
  for (const row of prefRows) {
    const meta = byId.get(row.kink_id);
    const name = meta?.name;
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
