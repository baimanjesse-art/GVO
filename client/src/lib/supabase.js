import { createClient } from "@supabase/supabase-js";

// Configured via Vercel env vars (Settings → Environment Variables):
//   VITE_SUPABASE_URL       = https://<project>.supabase.co
//   VITE_SUPABASE_ANON_KEY  = <the project's anon/public key>
// Trim whitespace and any trailing slash — a stray "/" turns auth calls into
// "…supabase.co//auth/v1/signup", which the gateway rejects as an invalid path.
const url = (import.meta.env.VITE_SUPABASE_URL || "").trim().replace(/\/+$/, "");
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

export const isSupabaseConfigured = Boolean(url && anonKey);

// One shared client for auth, database and realtime. When the env vars are
// absent (local dev before setup), this is null — the offline modes still work
// and the account/online screens show a friendly "not configured yet" note
// instead of crashing.
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
