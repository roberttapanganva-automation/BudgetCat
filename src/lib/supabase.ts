import { createClient, type Session } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

let activeSessionRequest: Promise<Session | null> | null = null;

export async function getSupabaseSessionOnce() {
  if (!supabase) return null;
  if (activeSessionRequest) return activeSessionRequest;

  activeSessionRequest = supabase.auth
    .getSession()
    .then(({ data, error }) => {
      if (error) throw error;
      return data.session ?? null;
    })
    .finally(() => {
      activeSessionRequest = null;
    });

  return activeSessionRequest;
}
