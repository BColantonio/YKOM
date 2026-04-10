import { unlockSubkinksForParent, type DeckKink } from '@/lib/local-kinks';

export type { DeckKink };

/** Legacy semantic names (unlock data lives in `lib/local-kinks.ts`). */
export const UNLOCK_RULES = {
  bondage: ['rope bondage', 'shibari'],
  roleplay: ['teacher/student', 'boss/employee'],
} as const;

/** Sub-kinks to append after Mood/Yes on the parent kink id (local ids only; no Supabase). */
export function getUnlockKinksForParentId(parentId: number): DeckKink[] {
  return unlockSubkinksForParent(parentId);
}
