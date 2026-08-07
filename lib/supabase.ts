import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://taeseyhaxvoosbiecxjx.supabase.co';
  // Ensure the URL always starts with https://
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  // Strip trailing /rest/v1 if included
  return url.replace(/\/rest\/v1\/?$/, '');
};

const getSupabaseKey = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_qaBzjTnUelzuX1zlYd25EQ_VpjM_db0';
};

export const createClient = () => {
  return createSupabaseClient(getSupabaseUrl(), getSupabaseKey());
};

// Singleton instance initialized lazily to avoid static prerender build errors
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_target, prop: keyof ReturnType<typeof createSupabaseClient>) {
    if (!supabaseInstance) {
      supabaseInstance = createClient();
    }
    const value = supabaseInstance[prop];
    return typeof value === 'function' ? value.bind(supabaseInstance) : value;
  },
});