import type { DeckKink, Kink } from '@/lib/kinks';

export type { DeckKink };

/**
 * Only these parent kink ids unlock sub-kinks on Mood (67) or Yes (100), matching previous behavior
 * (bondage + roleplay trees: 101–102 under 1, 103–104 under 2).
 */
export const UNLOCK_PARENT_IDS: ReadonlySet<number> = new Set([1, 2]);

/** Legacy semantic names (sub-kinks now live in `public.kinks` with `parent_id`). */
export const UNLOCK_RULES = {
  bondage: ['rope bondage', 'shibari'],
  roleplay: ['teacher/student', 'boss/employee'],
} as const;

/**
 * Sub-kinks to append after Mood/Yes on a parent id (DB-driven; same shuffle rules as before).
 */
export function getUnlockKinksForParentId(parentId: number, allKinks: Kink[]): DeckKink[] {
  if (!UNLOCK_PARENT_IDS.has(parentId)) return [];

  const parent = allKinks.find((k) => k.id === parentId);
  const parentLabel = parent?.name;

  return allKinks
    .filter((k) => k.parent_id === parentId && k.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(
      (k): DeckKink => ({
        id: k.id,
        label: k.name,
        parentLabel,
        description: k.description ?? null,
      }),
    );
}
