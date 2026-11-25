import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./supabase/admin";
import { sessionClient } from "./supabase/server";
import { isLocale, type Locale } from "./i18n/config";

/**
 * Who is asking. The Supabase login proves the email; the fgc_profiles row decides what it may see:
 * an admin sees every business, a client exactly one. A login without a profile (say, a Meristoll
 * user) gets nothing here. Every page and server action starts with requireViewer or requireAdmin.
 */
export type Viewer = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "client";
  businessId: string | null;
  businessName: string | null;
  lang: Locale;
};

type ProfileRow = { user_id: string; email: string; name: string; role: "admin" | "client"; business_id: string | null; lang: string };

/** The signed-in user id, from a verified token (getClaims), or null. */
export const currentUserId = cache(async (): Promise<{ id: string; email: string } | null> => {
  const supabase = await sessionClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return sub ? { id: sub, email: String(data?.claims?.email ?? "") } : null;
});

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const user = await currentUserId();
  if (!user) return null;
  const { data: p } = await db().from("fgc_profiles").select("user_id, email, name, role, business_id, lang").eq("user_id", user.id).maybeSingle<ProfileRow>();
  if (!p) return null;
  let businessName: string | null = null;
  if (p.role === "client") {
    const { data: b } = await db().from("fgc_businesses").select("name, archived_at").eq("id", p.business_id).maybeSingle<{ name: string; archived_at: string | null }>();
    if (!b || b.archived_at) return null;
    businessName = b.name;
  }
  return {
    id: p.user_id,
    email: p.email || user.email,
    name: p.name,
    role: p.role,
    businessId: p.role === "client" ? p.business_id : null,
    businessName,
    lang: isLocale(p.lang) ? p.lang : "en",
  };
});

/** Pages: the viewer, or off to the login page (with a note when the login has no access here). */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (viewer) return viewer;
  redirect((await currentUserId()) ? "/login?denied=1" : "/login");
}

/** Admin-only pages: a client gets a 404, so they don't learn the page exists. */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (viewer.role !== "admin") notFound();
  return viewer;
}

/** Server actions: the viewer or null (actions return an error instead of redirecting). */
export async function actionViewer(adminOnly = false): Promise<Viewer | null> {
  const viewer = await getViewer();
  if (!viewer || (adminOnly && viewer.role !== "admin")) return null;
  return viewer;
}

/** The name shown next to a comment or an approval. */
export const displayName = (v: Viewer) => v.name || v.email.split("@")[0];
