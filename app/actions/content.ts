"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionViewer, displayName, type Viewer } from "@/lib/auth";
import { buildAnchor, MAX_QUOTE } from "@/lib/content/anchor";
import { templateDoc, templateText } from "@/lib/content/template";
import { canClientSet, clientCanAct, statusAfterSave, statusFields } from "@/lib/content/status";
import { cleanUrl, isFormat, isPlatform, isStatus, type ContentItem, type ContentLink, type Format, type Platform, type Status } from "@/lib/content/types";
import { isIsoDay, isTime } from "@/lib/dates";
import { getI18n } from "@/lib/i18n";
import { db } from "@/lib/supabase/admin";

/**
 * Every write to content and comments. Each action checks the viewer again (never trust the page that
 * called it): the team may do anything; a client may only comment on, reply to and decide about their
 * own business's pieces, and only while the piece is with them.
 */

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const UUID = /^[0-9a-f-]{36}$/i;

async function fail(key: "error" | "notAllowed" | "stale" = "error"): Promise<{ ok: false; error: string }> {
  const { t } = await getI18n();
  return { ok: false, error: t.common[key] };
}

const refresh = () => revalidatePath("/", "layout");

/** The piece, if this viewer may touch it. */
async function loadFor(viewer: Viewer, id: string): Promise<ContentItem | null> {
  if (!UUID.test(id)) return null;
  const { data } = await db().from("fgc_content").select("*").eq("id", id).maybeSingle<ContentItem>();
  if (!data) return null;
  if (viewer.role === "client" && (data.business_id !== viewer.businessId || data.status === "draft")) return null;
  return data;
}

const by = (v: Viewer) => ({ kind: v.role === "admin" ? ("team" as const) : ("client" as const), name: displayName(v) });

// ---------------------------------------------------------------- create

export type CreateState = { error?: string } | undefined;

export async function createContent(_: CreateState, form: FormData): Promise<CreateState> {
  const viewer = await actionViewer(true);
  const { t } = await getI18n();
  if (!viewer) return { error: t.common.notAllowed };

  const businessId = String(form.get("business_id") ?? "");
  const title = String(form.get("title") ?? "").trim().slice(0, 300);
  const format = String(form.get("format") ?? "reel");
  const platforms = form.getAll("platforms").map(String).filter(isPlatform);
  const publishOn = String(form.get("publish_on") ?? "");
  const publishTime = String(form.get("publish_time") ?? "");
  const useTemplate = form.get("template") === "on";

  if (!UUID.test(businessId)) return { error: t.newContent.errors.business };
  if (!title) return { error: t.newContent.errors.title };
  if (platforms.length === 0) return { error: t.newContent.errors.platforms };
  if (!isFormat(format)) return { error: t.common.error };

  // Links to graphics and materials: rows of label + url; empty rows are skipped, a bad url is an error.
  const labels = form.getAll("link_label").map(String);
  const links: ContentLink[] = [];
  for (const [i, raw] of form.getAll("link_url").map(String).slice(0, 20).entries()) {
    if (!raw.trim()) continue;
    const url = cleanUrl(raw);
    if (!url) return { error: t.newContent.errors.link };
    links.push({ label: (labels[i] ?? "").trim().slice(0, 120), url });
  }

  const rows = useTemplate ? t.templates[format] : [];
  const { data, error } = await db()
    .from("fgc_content")
    .insert({
      business_id: businessId,
      title,
      format,
      platforms,
      body: useTemplate ? templateDoc(rows) : { type: "doc", content: [{ type: "paragraph" }] },
      body_text: useTemplate ? templateText(rows) : "",
      publish_on: isIsoDay(publishOn) ? publishOn : null,
      publish_time: isIsoDay(publishOn) && isTime(publishTime) ? publishTime : null,
      links,
      created_by: viewer.id,
    })
    .select("id")
    .single();
  if (error || !data) return { error: t.common.error };
  refresh();
  redirect(`/content/${data.id}`);
}

// ---------------------------------------------------------------- team edits

export type SaveInput = {
  title: string;
  body: Record<string, unknown>;
  bodyText: string;
  format: Format;
  platforms: Platform[];
  publishOn: string | null;
  publishTime: string | null;
  links: ContentLink[];
  publishedUrl: string;
  status?: Status;
  /** The updated_at the editor loaded; a newer one in the database means someone else saved. */
  expectedUpdatedAt: string;
};

export async function saveContent(id: string, input: SaveInput): Promise<Result<{ updatedAt: string; status: Status }>> {
  const viewer = await actionViewer(true);
  if (!viewer) return fail("notAllowed");
  const current = await loadFor(viewer, id);
  if (!current) return fail("notAllowed");
  // Postgres answers "...123456+00:00", JavaScript writes "...123Z": compare the instants, not the strings.
  if (Date.parse(current.updated_at) !== Date.parse(input.expectedUpdatedAt)) return fail("stale");

  const title = String(input.title ?? "").trim().slice(0, 300);
  if (!title || !isFormat(input.format) || !input.body || typeof input.body !== "object") return fail();
  const platforms = [...new Set((input.platforms ?? []).filter(isPlatform))];
  const links: ContentLink[] = [];
  for (const l of (input.links ?? []).slice(0, 20)) {
    const url = cleanUrl(l?.url);
    if (url) links.push({ label: String(l.label ?? "").trim().slice(0, 120), url });
  }
  const publishedUrl = cleanUrl(input.publishedUrl) ?? "";
  const bodyText = String(input.bodyText ?? "").slice(0, 100000);
  const publishOn = isIsoDay(input.publishOn) ? input.publishOn : null;

  const picked = isStatus(input.status) ? input.status : undefined;
  const next = statusAfterSave(current.status, picked, bodyText !== current.body_text);
  const now = new Date().toISOString();
  const { error } = await db()
    .from("fgc_content")
    .update({
      title,
      body: input.body,
      body_text: bodyText,
      format: input.format,
      platforms,
      publish_on: publishOn,
      publish_time: publishOn && isTime(input.publishTime) ? input.publishTime : null,
      links,
      published_url: publishedUrl,
      updated_at: now,
      ...(next ? statusFields(next, by(viewer), now, current.status) : {}),
    })
    .eq("id", id)
    .eq("updated_at", current.updated_at);
  if (error) return fail();
  refresh();
  return { ok: true, updatedAt: now, status: next ?? current.status };
}

/** The team's status buttons (send to client, approve for the client, mark published). */
export async function setStatus(id: string, status: Status, publishedUrl?: string): Promise<Result> {
  const viewer = await actionViewer(true);
  if (!viewer || !isStatus(status)) return fail("notAllowed");
  const current = await loadFor(viewer, id);
  if (!current) return fail("notAllowed");
  const now = new Date().toISOString();
  const url = publishedUrl === undefined ? undefined : cleanUrl(publishedUrl);
  if (url === null) return fail();
  const { error } = await db()
    .from("fgc_content")
    .update({ ...statusFields(status, by(viewer), now, current.status), ...(url !== undefined ? { published_url: url } : {}) })
    .eq("id", id);
  if (error) return fail();
  refresh();
  return { ok: true };
}

export async function deleteContent(id: string): Promise<Result> {
  const viewer = await actionViewer(true);
  if (!viewer || !UUID.test(id)) return fail("notAllowed");
  const { error } = await db().from("fgc_content").delete().eq("id", id);
  if (error) return fail();
  refresh();
  redirect("/content");
}

// ---------------------------------------------------------------- comments (both sides)

export type NewComment = { body: string; quote?: string | null; from?: number | null; to?: number | null };

/**
 * A new thread: on quoted words (anchored in the saved plain text) or on the whole piece. A client's
 * comment hands the piece back to the team.
 */
export async function addComment(contentId: string, input: NewComment): Promise<Result> {
  const viewer = await actionViewer();
  if (!viewer) return fail("notAllowed");
  const item = await loadFor(viewer, contentId);
  if (!item) return fail("notAllowed");
  if (viewer.role === "client" && !clientCanAct(item.status)) return fail("notAllowed");
  const body = String(input.body ?? "").trim().slice(0, 4000);
  if (!body) return fail();

  let anchor: ReturnType<typeof buildAnchor> = null;
  if (input.quote) {
    const from = Number(input.from);
    const to = Number(input.to);
    anchor = buildAnchor(item.body_text, from, to);
    // The page measured the text the viewer sees; if the saved text moved since, keep the quote alone.
    if (!anchor || anchor.quote !== input.quote) {
      const quote = String(input.quote).slice(0, MAX_QUOTE);
      anchor = { quote, prefix: "", suffix: "", from: null, to: null };
    }
  }

  const { error } = await db().from("fgc_comments").insert({
    content_id: item.id,
    business_id: item.business_id,
    author_id: viewer.id,
    author_kind: by(viewer).kind,
    author_name: displayName(viewer),
    body,
    quote: anchor?.quote ?? null,
    prefix: anchor?.prefix ?? null,
    suffix: anchor?.suffix ?? null,
    anchor_from: anchor?.from ?? null,
    anchor_to: anchor?.to ?? null,
  });
  if (error) return fail();
  if (viewer.role === "client" && (item.status === "in_review" || item.status === "approved")) {
    await db().from("fgc_content").update(statusFields("changes_requested", by(viewer), new Date().toISOString())).eq("id", item.id);
  }
  refresh();
  return { ok: true };
}

export async function replyComment(contentId: string, threadId: string, text: string): Promise<Result> {
  const viewer = await actionViewer();
  if (!viewer || !UUID.test(threadId)) return fail("notAllowed");
  const item = await loadFor(viewer, contentId);
  if (!item) return fail("notAllowed");
  if (viewer.role === "client" && !clientCanAct(item.status)) return fail("notAllowed");
  const body = String(text ?? "").trim().slice(0, 4000);
  if (!body) return fail();
  const { data: thread } = await db().from("fgc_comments").select("id, parent_id").eq("id", threadId).eq("content_id", item.id).maybeSingle();
  if (!thread || thread.parent_id) return fail();
  const { error } = await db().from("fgc_comments").insert({
    content_id: item.id,
    business_id: item.business_id,
    parent_id: thread.id,
    author_id: viewer.id,
    author_kind: by(viewer).kind,
    author_name: displayName(viewer),
    body,
  });
  if (error) return fail();
  refresh();
  return { ok: true };
}

/** The team closes a thread once the text is fixed (or reopens it). */
export async function resolveThread(contentId: string, threadId: string, resolved: boolean): Promise<Result> {
  const viewer = await actionViewer(true);
  if (!viewer || !UUID.test(threadId) || !UUID.test(contentId)) return fail("notAllowed");
  const { error } = await db()
    .from("fgc_comments")
    .update({ resolved_at: resolved ? new Date().toISOString() : null })
    .eq("id", threadId)
    .eq("content_id", contentId)
    .is("parent_id", null);
  if (error) return fail();
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------- the client's decision

/** Approve, or ask for changes with a note (saved as a comment on the whole piece). */
export async function clientDecide(contentId: string, next: "approved" | "changes_requested", note?: string): Promise<Result> {
  const viewer = await actionViewer();
  if (!viewer || viewer.role !== "client") return fail("notAllowed");
  const item = await loadFor(viewer, contentId);
  if (!item || !canClientSet(item.status, next)) return fail("notAllowed");
  if (next === "changes_requested") {
    const body = String(note ?? "").trim().slice(0, 4000);
    if (!body) return fail();
    const { error } = await db().from("fgc_comments").insert({
      content_id: item.id,
      business_id: item.business_id,
      author_id: viewer.id,
      author_kind: "client",
      author_name: displayName(viewer),
      body,
    });
    if (error) return fail();
  }
  const { error } = await db().from("fgc_content").update(statusFields(next, by(viewer), new Date().toISOString())).eq("id", item.id);
  if (error) return fail();
  refresh();
  return { ok: true };
}
