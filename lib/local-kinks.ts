import { BASE_KINKS } from '@/lib/base-kinks';

/**
 * Local kink ids/names for the swipe deck (no Supabase `kinks` fetch).
 * Preferences still save `kink_id` to `user_kink_preferences`.
 */
export type DeckKink = { id: number; label: string; /** Set for unlock sub-kinks so the parent category can be shown on the card. */ parentLabel?: string };

export { BASE_KINKS };

/** Sub-kinks unlocked when parent id is swiped Mood (67) or Yes (100). */
export const UNLOCK_SUBKINKS_BY_PARENT_ID: Record<number, DeckKink[]> = {
  1: [
    { id: 101, label: 'Rope bondage' },
    { id: 102, label: 'Shibari' },
  ],
  2: [
    { id: 103, label: 'Teacher/student' },
    { id: 104, label: 'Boss/employee' },
  ],
};

export function formatKinkDisplayName(slug: string): string {
  return slug
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function baseDeckCategories(): DeckKink[] {
  return BASE_KINKS.map((k) => ({ id: k.id, label: formatKinkDisplayName(k.name) }));
}

function buildKinkIdToLabelMap(): Map<number, string> {
  const m = new Map<number, string>();
  for (const k of BASE_KINKS) {
    m.set(k.id, formatKinkDisplayName(k.name));
  }
  for (const subs of Object.values(UNLOCK_SUBKINKS_BY_PARENT_ID)) {
    for (const s of subs) {
      m.set(s.id, s.label);
    }
  }
  return m;
}

let labelMap: Map<number, string> | null = null;

export function getKinkLabelById(kinkId: number): string | undefined {
  if (!labelMap) labelMap = buildKinkIdToLabelMap();
  return labelMap.get(kinkId);
}

/** Unlock sub-kinks with `parentLabel` filled from {@link BASE_KINKS} for UI. */
export function unlockSubkinksForParent(parentId: number): DeckKink[] {
  const subs = UNLOCK_SUBKINKS_BY_PARENT_ID[parentId];
  if (!subs) return [];
  const parent = BASE_KINKS.find((k) => k.id === parentId);
  const parentLabel = parent ? formatKinkDisplayName(parent.name) : undefined;
  return subs.map((s) => ({ ...s, parentLabel }));
}
