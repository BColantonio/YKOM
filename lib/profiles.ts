import { supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchProfileByUserId(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

  if (error) {
    console.error('fetchProfileByUserId:', error.message);
    return null;
  }
  if (!data) return null;

  return {
    id: String(data.id),
    username: String(data.username),
    avatar_url: data.avatar_url != null ? String(data.avatar_url) : null,
    created_at: String(data.created_at),
    updated_at: String(data.updated_at),
  };
}

export async function updateProfileUsername(userId: string, username: string): Promise<boolean> {
  const trimmed = username.trim();
  if (!trimmed) return false;

  const { error } = await supabase.from('profiles').update({ username: trimmed }).eq('id', userId);

  if (error) {
    console.error('updateProfileUsername:', error.message);
    return false;
  }
  return true;
}
