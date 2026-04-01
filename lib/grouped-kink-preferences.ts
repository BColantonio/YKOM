import { supabase } from '@/lib/supabase';

export type GroupedKinkPreference = {
  kinkId: number;
  kinkName: string;
  value: number | null;
};

export type GroupedKinkPreferencesByCategory = {
  categoryName: string;
  kinks: GroupedKinkPreference[];
};

type KinkWithCategory = {
  id: number;
  name: string;
  categories: { name: string } | { name: string }[] | null;
};

function categoryNameFromKinkRow(k: KinkWithCategory): string {
  const c = k.categories;
  if (c == null) return 'Uncategorized';
  if (Array.isArray(c)) return c[0]?.name ?? 'Uncategorized';
  return c.name ?? 'Uncategorized';
}

/** Loads `user_kink_preferences` joined with `kinks` and `categories`, grouped by category name. */
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

  const kinkIds = [...new Set(prefRows.map((r) => r.kink_id))];
  const { data: kinkRows, error: kinkError } = await supabase
    .from('kinks')
    .select('id, name, categories(name)')
    .in('id', kinkIds);

  if (kinkError) {
    console.error('Failed to fetch kinks:', kinkError.message);
    return [];
  }

  const kinkById = new Map(
    (kinkRows as KinkWithCategory[] | null)?.map((k) => [
      k.id,
      { name: k.name, categoryName: categoryNameFromKinkRow(k) },
    ]) ?? [],
  );

  const grouped = new Map<string, GroupedKinkPreference[]>();
  for (const row of prefRows) {
    const meta = kinkById.get(row.kink_id);
    if (!meta) continue;
    const entry: GroupedKinkPreference = {
      kinkId: row.kink_id,
      kinkName: meta.name,
      value: typeof row.value === 'number' ? row.value : null,
    };
    const list = grouped.get(meta.categoryName) ?? [];
    list.push(entry);
    grouped.set(meta.categoryName, list);
  }

  for (const list of grouped.values()) {
    list.sort((a, b) => a.kinkName.localeCompare(b.kinkName));
  }

  const categoryNames = [...grouped.keys()].sort((a, b) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });

  return categoryNames.map((categoryName) => ({
    categoryName,
    kinks: grouped.get(categoryName) ?? [],
  }));
}
