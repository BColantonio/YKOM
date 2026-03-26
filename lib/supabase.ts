import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oubywpfclchxdwzgfdnq.supabase.co';
const supabaseAnonKey = 'sb_publishable_F2z1ejxtiytJHYO0oyDCNA_LqF2iwwL';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
