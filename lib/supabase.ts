import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const getSupabaseUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://taeseyhaxvoosbiecxjx.supabase.co';
  
  // Ensure protocol exists
  let url = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
  
  // Strip out any trailing path or /rest/v1 if present
  try {
    const parsed = new URL(url);
    return parsed.origin; // Always returns clean "https://domain.supabase.co"
  } catch {
    return 'https://taeseyhaxvoosbiecxjx.supabase.co';
  }
};

const getSupabaseKey = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_qaBzjTnUelzuX1zlYd25EQ_VpjM_db0';
};

export const createClient = () => {
  return createSupabaseClient(getSupabaseUrl(), getSupabaseKey());
};

let supabaseInstance: any = null;

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop: string) {
    if (!supabaseInstance) {
      supabaseInstance = createClient();
    }
    const value = supabaseInstance[prop];
    return typeof value === 'function' ? value.bind(supabaseInstance) : value;
  },
});