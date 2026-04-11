import { supabase } from '@/lib/supabase';

/** Row for UI; username/avatar are placeholders until a profiles join exists. */
export type FollowListRow = {
  followRowId: string;
  followedId: string;
  username: string;
  avatarUrl: string | null;
};

/**
 * Loads follows for the current user as follower.
 * Selects `followed_id` from `public.follows`. Username/avatar are placeholders for now
 * (no `profiles` table in this migration).
 */
export async function fetchFollowsForFollower(followerId: string): Promise<FollowListRow[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('id, followed_id')
    .eq('follower_id', followerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchFollowsForFollower:', error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    followRowId: String(row.id),
    followedId: String(row.followed_id),
    username: placeholderUsername(String(row.followed_id)),
    avatarUrl: null as string | null,
  }));
}

function placeholderUsername(followedId: string): string {
  const short = followedId.replace(/-/g, '').slice(0, 8);
  return `User ${short}`;
}
