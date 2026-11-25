"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionViewer } from "@/lib/auth";
import { cleanUrl } from "@/lib/content/types";

import { getI18n } from "@/lib/i18n";
import { db } from "@/lib/supabase/admin";

/** Businesses and users: admins only. Each action checks again. */

export type FormState = { error?: string; ok?: string } | undefined;
const UUID = /^[0-9a-f-]{36}$/i;
const refresh = () => revalidatePath("/", "layout");

// ---------------------------------------------------------------- businesses

function businessFields(form: FormData, t: Awaited<ReturnType<typeof getI18n>>["t"]): { error: string } | { name: string; assets_url: string; notes: string } {
  const name = String(form.get("name") ?? "").trim().slice(0, 200);
  const assets = cleanUrl(form.get("assets_url"));
  if (!name) return { error: t.businesses.errors.name };
  if (assets === null) return { error: t.businesses.errors.url };
  return { name, assets_url: assets, notes: String(form.get("notes") ?? "").trim().slice(0, 4000) };
}

export async function createBusiness(_: FormState, form: FormData): Promise<FormState> {
  const { t } = await getI18n();
  if (!(await actionViewer(true))) return { error: t.common.notAllowed };
  const fields = businessFields(form, t);
  if ("error" in fields) return fields;
  const { data, error } = await db().from("fgc_businesses").insert(fields).select("id").single();
  if (error || !data) return { error: t.common.error };
  refresh();
  redirect(`/businesses/${data.id}`);
}

export async function updateBusiness(id: string, _: FormState, form: FormData): Promise<FormState> {
  const { t } = await getI18n();
  if (!(await actionViewer(true)) || !UUID.test(id)) return { error: t.common.notAllowed };
  const fields = businessFields(form, t);
  if ("error" in fields) return fields;
  const { error } = await db().from("fgc_businesses").update(fields).eq("id", id);
  if (error) return { error: t.common.error };
  refresh();
  return { ok: t.common.saved };
}

export async function setBusinessArchived(id: string, archived: boolean): Promise<void> {
  if (!(await actionViewer(true)) || !UUID.test(id)) return;
  await db().from("fgc_businesses").update({ archived_at: archived ? new Date().toISOString() : null }).eq("id", id);
  refresh();
}

// ---------------------------------------------------------------- users

/**
 * Adds a login with a password the admin passes on (no email: the shared Supabase project's emails
 * point at Meristoll). An email that already has a login on the project (say, a Meristoll admin) keeps
 * its password and just gets a profile here.
 */
export async function createUser(_: FormState, form: FormData): Promise<FormState> {
  const { t } = await getI18n();
  const viewer = await actionViewer(true);
  if (!viewer) return { error: t.common.notAllowed };

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim().slice(0, 200);
  const password = String(form.get("password") ?? "");
  const role = form.get("role") === "admin" ? "admin" : "client";
  const businessId = String(form.get("business_id") ?? "");
  const lang = form.get("lang") === "pl" ? "pl" : "en";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: t.users.errors.email };
  if (role === "client" && !UUID.test(businessId)) return { error: t.users.errors.business };

  // An existing login keeps its password; a new one needs a proper password.
  let userId = await findUserId(email);
  const existing = Boolean(userId);
  if (!userId) {
    if (password.length < 8) return { error: t.users.errors.password };
    const created = await db().auth.admin.createUser({ email, password, email_confirm: true });
    if (!created.data.user) return { error: t.common.error };
    userId = created.data.user.id;
  }

  const { data: has } = await db().from("fgc_profiles").select("user_id").eq("user_id", userId).maybeSingle();
  if (has) return { error: t.users.errors.exists };
  const { error } = await db()
    .from("fgc_profiles")
    .insert({ user_id: userId, email, name, role, business_id: role === "client" ? businessId : null, lang });
  if (error) return { error: t.common.error };
  refresh();
  return { ok: existing ? t.users.existing : t.users.created };
}

async function findUserId(email: string): Promise<string | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db().auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

/** Takes away access to this app only. The login itself may be used by Meristoll, so it stays. */
export async function removeUser(userId: string): Promise<{ error?: string }> {
  const { t } = await getI18n();
  const viewer = await actionViewer(true);
  if (!viewer || !UUID.test(userId)) return { error: t.common.notAllowed };
  if (userId === viewer.id) return { error: t.users.errors.self };
  const { error } = await db().from("fgc_profiles").delete().eq("user_id", userId);
  if (error) return { error: t.common.error };
  refresh();
  return {};
}

export async function resetPassword(userId: string, password: string): Promise<{ error?: string; ok?: string }> {
  const { t } = await getI18n();
  const viewer = await actionViewer(true);
  if (!viewer || !UUID.test(userId)) return { error: t.common.notAllowed };
  if (String(password).length < 8) return { error: t.users.errors.password };
  const { data: profile } = await db().from("fgc_profiles").select("user_id").eq("user_id", userId).maybeSingle();
  if (!profile) return { error: t.common.notAllowed };
  const { error } = await db().auth.admin.updateUserById(userId, { password });
  if (error) return { error: t.common.error };
  return { ok: t.users.resetDone };
}

// ---------------------------------------------------------------- the viewer's own account

export async function updateName(_: FormState, form: FormData): Promise<FormState> {
  const { t } = await getI18n();
  const viewer = await actionViewer();
  if (!viewer) return { error: t.common.notAllowed };
  const name = String(form.get("name") ?? "").trim().slice(0, 200);
  const { error } = await db().from("fgc_profiles").update({ name }).eq("user_id", viewer.id);
  if (error) return { error: t.common.error };
  refresh();
  return { ok: t.common.saved };
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const { t } = await getI18n();
  const viewer = await actionViewer();
  if (!viewer) return { error: t.common.notAllowed };
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: t.account.tooShort };
  if (password !== String(form.get("repeat") ?? "")) return { error: t.account.mismatch };
  const { error } = await db().auth.admin.updateUserById(viewer.id, { password });
  if (error) return { error: t.common.error };
  return { ok: t.account.passwordChanged };
}

