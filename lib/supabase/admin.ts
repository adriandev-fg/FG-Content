import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { secretKey, supabaseUrl } from "./env";

/**
 * Secret-key client. Every read and write of the fgc_ tables goes through it, after lib/auth.ts has
 * checked who is asking. Bypasses row level security: never import it from a client component.
 */
let client: SupabaseClient | undefined;

export function db(): SupabaseClient {
  if (client) return client;
  const url = supabaseUrl();
  const key = secretKey();
  if (!url || !key) throw new Error("Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY");
  return (client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
}
