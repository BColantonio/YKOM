import { supabase } from '@/lib/supabase';

/** Row from `public.kinks` (active deck subset uses `is_active` and ordering). */
export type Kink = {
  id: number;
  name: string;
  parent_id: number | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

/** Swipe deck card shape (labels + optional copy for future expanded UI). */
export type DeckKink = {
  id: number;
  label: string;
  parentLabel?: string;
  description?: string | null;
};

function rowToKink(row: Record<string, unknown>): Kink | null {
  const id = typeof row.id === 'number' ? row.id : Number(row.id);
  if (!Number.isFinite(id)) return null;
  const sort_order = typeof row.sort_order === 'number' ? row.sort_order : Number(row.sort_order);
  const name = typeof row.name === 'string' ? row.name : '';
  const parentRaw = row.parent_id;
  const parent_id =
    parentRaw === null || parentRaw === undefined
      ? null
      : typeof parentRaw === 'number'
        ? parentRaw
        : Number(parentRaw);
  const description = row.description == null ? null : String(row.description);
  const is_active = Boolean(row.is_active);
  return {
    id,
    name,
    parent_id: parent_id != null && Number.isFinite(parent_id) ? parent_id : null,
    description,
    sort_order: Number.isFinite(sort_order) ? sort_order : id,
    is_active,
  };
}

/** All active kinks from the database, ordered for display. */
export async function fetchAllKinks(): Promise<Kink[]> {
  const { data, error } = await supabase
    .from('kinks')
    .select('id, name, parent_id, description, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('fetchAllKinks:', error.message);
    return [];
  }

  const out: Kink[] = [];
  for (const row of data ?? []) {
    const k = rowToKink(row as Record<string, unknown>);
    if (k) out.push(k);
  }
  return out;
}

/** Active kinks that share a parent (e.g. unlock sub-kinks). */
export async function fetchKinksByParent(parentId: number): Promise<Kink[]> {
  const { data, error } = await supabase
    .from('kinks')
    .select('id, name, parent_id, description, sort_order, is_active')
    .eq('parent_id', parentId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('fetchKinksByParent:', error.message);
    return [];
  }

  const out: Kink[] = [];
  for (const row of data ?? []) {
    const k = rowToKink(row as Record<string, unknown>);
    if (k) out.push(k);
  }
  return out;
}

/** Top-level kinks for the initial deck (no parent). */
export function rootKinksToDeck(kinks: Kink[]): DeckKink[] {
  return kinks
    .filter((k) => k.parent_id == null)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((k) => ({
      id: k.id,
      label: k.name,
      description: k.description ?? null,
    }));
}

export function buildKinkIdMap(kinks: Kink[]): Map<number, Kink> {
  return new Map(kinks.map((k) => [k.id, k]));
}
