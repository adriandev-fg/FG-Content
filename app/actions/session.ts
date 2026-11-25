"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { isLocale, LANG_COOKIE, type Locale } from "@/lib/i18n/config";
import { db } from "@/lib/supabase/admin";
import { sessionClient } from "@/lib/supabase/server";

const LANG_COOKIE_OPTIONS = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const, httpOnly: false };

/** Only paths inside this app, so ?next= can't send anyone elsewhere. */
const safeNext = (v: unknown) => (typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/login") ? v : "/");

export async function signIn(_: unknown, form: FormData): Promise<{ error: "invalid" | "noAccess" } | void> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "invalid" };
  const supabase = await sessionClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "invalid" };

  // A login from another app on the same Supabase project (Meristoll) has no profile here.
  const { data: profile } = await db().from("fgc_profiles").select("lang, role, business_id").eq("user_id", data.user.id).maybeSingle();
  if (!profile) {
    await supabase.auth.signOut();
    return { error: "noAccess" };
  }
  if (profile.role === "client") {
    const { data: b } = await db().from("fgc_businesses").select("archived_at").eq("id", profile.business_id).maybeSingle();
    if (!b || b.archived_at) {
      await supabase.auth.signOut();
      return { error: "noAccess" };
    }
  }
  if (isLocale(profile.lang)) (await cookies()).set(LANG_COOKIE, profile.lang, LANG_COOKIE_OPTIONS);
  redirect(safeNext(form.get("next")));
}

export async function signOut() {
  const supabase = await sessionClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** The language switch: a cookie for every page, and the profile so it follows the user to the next device. */
export async function setLanguage(lang: Locale) {
  if (!isLocale(lang)) return;
  (await cookies()).set(LANG_COOKIE, lang, LANG_COOKIE_OPTIONS);
  const viewer = await getViewer();
  if (viewer) await db().from("fgc_profiles").update({ lang }).eq("user_id", viewer.id);
}
