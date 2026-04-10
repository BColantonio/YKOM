import { createClient } from '@supabase/supabase-js';

/**
 * Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env` (restart Expo).
 * Use the project URL and anon / publishable key from Supabase → Settings → API.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://oubywpfclchxdwzgfdnq.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_F2z1ejxtiytJHYO0oyDCNA_LqF2iwwL';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
