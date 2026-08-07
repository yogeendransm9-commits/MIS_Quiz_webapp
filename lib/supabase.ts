import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://taeseyhaxvoosbiecxjx.supabase.co';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url.replace(/\/rest\/v1\/?$/, '');
};

const getSupabaseKey = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_qaBzjTnUelzuX1zlYd25EQ_VpjM_db0';
};

export const createClient = () => {
  return createSupabaseClient(getSupabaseUrl(), getSupabaseKey());
};

// Use any to prevent generic type assignment mismatches
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