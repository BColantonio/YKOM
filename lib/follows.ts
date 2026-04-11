import { supabase } from '@/lib/supabase';

/** Row for UI: follows row + joined profile fields when available. */
export type FollowListRow = {
  followRowId: string;
  followedId: string;
  username: string;
  avatarUrl: string | null;
};

/**
 * Loads people the current user follows, ordered by follow time (newest first),
 * with `public.profiles` username and avatar_url.
 */
export async function fetchMyFollows(followerId: string): Promise<FollowListRow[]> {
  const { data: followRows, error: followError } = await supabase
    .from('follows')
    .select('id, followed_id, created_at')
    .eq('follower_id', followerId)
    .order('created_at', { ascending: false });

  if (followError) {
    console.error('fetchMyFollows follows:', followError.message);
    return [];
  }
  if (!followRows?.length) return [];

  const ids = [...new Set(followRows.map((r) => r.followed_id as string))];
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', ids);

  if (profileError) {
    console.error('fetchMyFollows profiles:', profileError.message);
  }

  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  return followRows.map((row) => {
    const fid = String(row.followed_id);
    const p = profileById.get(fid);
    return {
      followRowId: String(row.id),
      followedId: fid,
      username: p?.username ?? placeholderUsername(fid),
      avatarUrl: p?.avatar_url ?? null,
    };
  });
}

/** @deprecated Use fetchMyFollows — kept for any older imports. */
export async function fetchFollowsForFollower(followerId: string): Promise<FollowListRow[]> {
  return fetchMyFollows(followerId);
}

function placeholderUsername(followedId: string): string {
  const short = followedId.replace(/-/g, '').slice(0, 8);
  return `User ${short}`;
}
