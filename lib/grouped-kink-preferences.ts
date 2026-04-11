import { supabase } from '@/lib/supabase';
import { buildKinkIdMap, fetchAllKinks, type Kink } from '@/lib/kinks';

export type GroupedKinkPreference = {
  kinkId: number;
  kinkName: string;
  value: number | null;
};

/** Parent deck category with optional preference on the parent + prefs on sub-kinks. */
export type ProfileKinkParentRow = {
  kind: 'parent';
  parentId: number;
  parentName: string;
  sortOrder: number;
  parentPreference: GroupedKinkPreference | null;
  children: GroupedKinkPreference[];
};

/** Root kink with no sub-kinks in the catalog (or ungrouped). */
export type ProfileKinkLeafRow = {
  kind: 'leaf';
  pref: GroupedKinkPreference;
  sortOrder: number;
};

export type ProfileKinkRow = ProfileKinkParentRow | ProfileKinkLeafRow;

export type GroupedKinkPreferencesByCategory = {
  categoryName: string;
  rows: ProfileKinkRow[];
};

const PROFILE_CATEGORY = 'Your kinks';

/** Loads preferences; uses `parent_id` from `kinkList` to nest sub-kinks under parents. */
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

  const prefEntries: GroupedKinkPreference[] = [];
  for (const row of prefRows) {
    const kid = row.kink_id as number;
    const meta = byId.get(kid);
    const name = meta?.name;
    if (!name) continue;
    prefEntries.push({
      kinkId: kid,
      kinkName: name,
      value: typeof row.value === 'number' ? row.value : null,
    });
  }

  const prefById = new Map(prefEntries.map((p) => [p.kinkId, p]));

  const childrenByParent = new Map<number, Kink[]>();
  for (const k of list) {
    if (k.parent_id != null) {
      const pid = k.parent_id;
      const arr = childrenByParent.get(pid) ?? [];
      arr.push(k);
      childrenByParent.set(pid, arr);
    }
  }
  for (const arr of childrenByParent.values()) {
    arr.sort((a, b) => a.sort_order - b.sort_order);
  }

  const roots = list.filter((k) => k.parent_id == null).sort((a, b) => a.sort_order - b.sort_order);

  const rows: ProfileKinkRow[] = [];
  const assigned = new Set<number>();

  for (const root of roots) {
    const subsMeta = childrenByParent.get(root.id) ?? [];
    const hasSubsInCatalog = subsMeta.length > 0;
    const parentPref = prefById.get(root.id) ?? null;
    const children: GroupedKinkPreference[] = subsMeta
      .map((sk) => prefById.get(sk.id))
      .filter((p): p is GroupedKinkPreference => p != null);

    if (hasSubsInCatalog) {
      if (parentPref != null || children.length > 0) {
        rows.push({
          kind: 'parent',
          parentId: root.id,
          parentName: root.name,
          sortOrder: root.sort_order,
          parentPreference: parentPref,
          children,
        });
        assigned.add(root.id);
        children.forEach((c) => assigned.add(c.kinkId));
      }
    } else if (parentPref != null) {
      rows.push({ kind: 'leaf', pref: parentPref, sortOrder: root.sort_order });
      assigned.add(root.id);
    }
  }

  for (const p of prefEntries) {
    if (!assigned.has(p.kinkId)) {
      const meta = byId.get(p.kinkId);
      rows.push({
        kind: 'leaf',
        pref: p,
        sortOrder: meta?.sort_order ?? p.kinkId,
      });
    }
  }

  rows.sort((a, b) => {
    const sa = a.sortOrder;
    const sb = b.sortOrder;
    return sa - sb;
  });

  return [{ categoryName: PROFILE_CATEGORY, rows }];
}
