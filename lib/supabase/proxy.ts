import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publishableKey, supabaseUrl } from "./env";

/** Refreshes the auth cookies and tells whether anyone is signed in. The pages check the profile. */
export async function refreshSession(request: NextRequest): Promise<{ response: NextResponse; signedIn: boolean }> {
  let response = NextResponse.next({ request });
  const url = supabaseUrl();
  const key = publishableKey();
  if (!url || !key) return { response, signedIn: false };

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet, headers) {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        for (const [k, v] of Object.entries(headers ?? {})) response.headers.set(k, v);
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  return { response, signedIn: Boolean(data?.claims?.sub) };
}

/** A redirect that keeps the refreshed auth cookies. */
export function redirectKeepingCookies(from: NextResponse, to: URL): NextResponse {
  const res = NextResponse.redirect(to);
  for (const c of from.cookies.getAll()) res.cookies.set(c);
  return res;
}
