import type { NextRequest } from "next/server";
import { redirectKeepingCookies, refreshSession } from "@/lib/supabase/proxy";

const LOGIN = "/login";

/**
 * Every page needs a signed-in user, except the login page. This is the fast first check; lib/auth.ts
 * checks the user's FG Content profile (admin or client, and which business) on every page and action.
 */
export async function proxy(request: NextRequest) {
  const { response, signedIn } = await refreshSession(request);
  const { pathname, search } = request.nextUrl;
  if (!signedIn && pathname !== LOGIN) {
    const to = new URL(LOGIN, request.url);
    if (pathname !== "/") to.searchParams.set("next", pathname + search);
    return redirectKeepingCookies(response, to);
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|favicon\\.ico|icon\\.png|.*\\.svg).*)"],
};
