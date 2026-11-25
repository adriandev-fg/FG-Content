import "server-only";
import type { Viewer } from "./auth";
import { db } from "./supabase/admin";
import { clientCanSee } from "./content/status";
import { isFormat, isPlatform, isStatus, type Business, type Comment, type ContentItem, type ContentRow, type Format, type Platform, type Status } from "./content/types";

/**
 * Every read of the fgc_ tables. Each function takes the viewer and scopes the query itself: a client
 * only ever gets their own business's rows, and never a draft. Keep it that way when adding one.
 */

const ROW_COLUMNS =
  "id, business_id, title, format, platforms, links, status, publish_on, publish_time, published_url, status_changed_at, approved_at, approved_by_kind, approved_by_name, created_at, updated_at";

export type ContentFilters = { businessId?: string; status?: Status; format?: Format; platform?: Platform; from?: string; to?: string; dated?: boolean };

export function parseFilters(sp: Record<string, string | string[] | undefined>): ContentFilters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const business = one("business");
  return {
    businessId: business && /^[0-9a-f-]{36}$/i.test(business) ? business : undefined,
    status: isStatus(one("status")) ? (one("status") as Status) : undefined,
    format: isFormat(one("format")) ? (one("format") as Format) : undefined,
    platform: isPlatform(one("platform")) ? (one("platform") as Platform) : undefined,
  };
}

/** Content rows (no body) the viewer may see, with business name and open comment count. */
export async function listContent(viewer: Viewer, f: ContentFilters = {}): Promise<ContentRow[]> {
  let q = db().from("fgc_content").select(ROW_COLUMNS);
  if (viewer.role === "client") q = q.eq("business_id", viewer.businessId!).neq("status", "draft");
  else if (f.businessId) q = q.eq("business_id", f.businessId);
  if (f.status && (viewer.role === "admin" || clientCanSee(f.status))) q = q.eq("status", f.status);
  if (f.format) q = q.eq("format", f.format);
  if (f.platform) q = q.contains("platforms", [f.platform]);
  if (f.from) q = q.gte("publish_on", f.from);
  if (f.to) q = q.lte("publish_on", f.to);
  if (f.dated === false) q = q.is("publish_on", null);
  const { data, error } = await q.order("publish_on", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }).limit(1000);
  if (error) throw new Error(`listContent: ${error.message}`);
  const rows = (data ?? []) as Omit<ContentRow, "business_name" | "open_comments">[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const [names, open] = await Promise.all([businessNames(viewer), openCommentCounts(ids)]);
  return rows.map((r) => ({ ...r, links: r.links ?? [], business_name: names.get(r.business_id) ?? "", open_comments: open.get(r.id) ?? 0 }));
}

async function businessNames(viewer: Viewer): Promise<Map<string, string>> {
  if (viewer.role === "client") return new Map([[viewer.businessId!, viewer.businessName ?? ""]]);
  const { data } = await db().from("fgc_businesses").select("id, name");
  return new Map((data ?? []).map((b) => [b.id as string, b.name as string]));
}

async function openCommentCounts(contentIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (let i = 0; i < contentIds.length; i += 200) {
    const { data } = await db().from("fgc_comments").select("content_id").in("content_id", contentIds.slice(i, i + 200)).is("parent_id", null).is("resolved_at", null);
    for (const c of data ?? []) counts.set(c.content_id as string, (counts.get(c.content_id as string) ?? 0) + 1);
  }
  return counts;
}

/** One piece with its comments, or null when the viewer may not see it. */
export async function getContent(viewer: Viewer, id: string): Promise<{ item: ContentItem; comments: Comment[]; business: Pick<Business, "id" | "name" | "assets_url"> } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data: item } = await db().from("fgc_content").select("*").eq("id", id).maybeSingle<ContentItem>();
  if (!item) return null;
  if (viewer.role === "client" && (item.business_id !== viewer.businessId || !clientCanSee(item.status))) return null;
  const [{ data: comments }, { data: business }] = await Promise.all([
    db().from("fgc_comments").select("*").eq("content_id", id).order("created_at", { ascending: true }),
    db().from("fgc_businesses").select("id, name, assets_url").eq("id", item.business_id).maybeSingle<Pick<Business, "id" | "name" | "assets_url">>(),
  ]);
  return { item: { ...item, links: item.links ?? [] }, comments: (comments ?? []) as Comment[], business: business ?? { id: item.business_id, name: "", assets_url: "" } };
}

export type BusinessSummary = Business & { content: number; waiting: number; changes: number; logins: number };

/** Businesses with their counts (admins only). */
export async function listBusinesses(includeArchived = false): Promise<BusinessSummary[]> {
  let q = db().from("fgc_businesses").select("*").order("name");
  if (!includeArchived) q = q.is("archived_at", null);
  const [{ data: businesses }, { data: content }, { data: profiles }] = await Promise.all([
    q,
    db().from("fgc_content").select("business_id, status"),
    db().from("fgc_profiles").select("business_id").eq("role", "client"),
  ]);
  return ((businesses ?? []) as Business[]).map((b) => {
    const own = (content ?? []).filter((c) => c.business_id === b.id);
    return {
      ...b,
      content: own.length,
      waiting: own.filter((c) => c.status === "in_review").length,
      changes: own.filter((c) => c.status === "changes_requested").length,
      logins: (profiles ?? []).filter((p) => p.business_id === b.id).length,
    };
  });
}

export async function getBusiness(id: string): Promise<Business | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await db().from("fgc_businesses").select("*").eq("id", id).maybeSingle<Business>();
  return data ?? null;
}

export type Profile = { user_id: string; email: string; name: string; role: "admin" | "client"; business_id: string | null; lang: string; created_at: string };

export async function listProfiles(businessId?: string): Promise<Profile[]> {
  let q = db().from("fgc_profiles").select("user_id, email, name, role, business_id, lang, created_at").order("role").order("email");
  if (businessId) q = q.eq("business_id", businessId);
  const { data } = await q;
  return (data ?? []) as Profile[];
}
