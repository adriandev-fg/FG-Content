import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publishableKey, supabaseUrl } from "./env";

/** The signed-in user's Supabase client (server components and server actions). Used for auth only. */
export async function sessionClient() {
  const store = await cookies();
  const url = supabaseUrl();
  const key = publishableKey();
  if (!url || !key) throw new Error("Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) store.set(name, value, options);
        } catch {
          // Server components can't set cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}
