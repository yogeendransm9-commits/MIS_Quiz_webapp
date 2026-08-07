import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const createClient = () => {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://taeseyhaxvoosbiecxjx.supabase.co';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_qaBzjTnUelzuX1zlYd25EQ_VpjM_db0';

  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
};

export const supabase = createClient();