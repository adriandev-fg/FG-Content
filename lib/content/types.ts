export const FORMATS = ["reel", "post", "carousel", "story"] as const;
export type Format = (typeof FORMATS)[number];

export const PLATFORMS = ["instagram", "tiktok", "facebook"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const STATUSES = ["draft", "in_review", "changes_requested", "approved", "published"] as const;
export type Status = (typeof STATUSES)[number];

export type ContentLink = { label: string; url: string };

export type Business = {
  id: string;
  name: string;
  assets_url: string;
  notes: string;
  archived_at: string | null;
  created_at: string;
};

export type ContentItem = {
  id: string;
  business_id: string;
  title: string;
  format: Format;
  platforms: Platform[];
  body: Record<string, unknown>;
  body_text: string;
  links: ContentLink[];
  status: Status;
  publish_on: string | null;
  publish_time: string | null;
  published_url: string;
  status_changed_at: string;
  approved_at: string | null;
  approved_by_kind: "client" | "team" | null;
  approved_by_name: string;
  created_at: string;
  updated_at: string;
};

/** A list row: no body. */
export type ContentRow = Omit<ContentItem, "body" | "body_text"> & { business_name: string; open_comments: number };

export type Comment = {
  id: string;
  content_id: string;
  parent_id: string | null;
  author_kind: "client" | "team";
  author_name: string;
  body: string;
  quote: string | null;
  prefix: string | null;
  suffix: string | null;
  anchor_from: number | null;
  anchor_to: number | null;
  resolved_at: string | null;
  created_at: string;
};

export type Thread = Comment & { replies: Comment[] };

export const isFormat = (v: unknown): v is Format => typeof v === "string" && (FORMATS as readonly string[]).includes(v);
export const isPlatform = (v: unknown): v is Platform => typeof v === "string" && (PLATFORMS as readonly string[]).includes(v);
export const isStatus = (v: unknown): v is Status => typeof v === "string" && (STATUSES as readonly string[]).includes(v);

/** Threads (top-level comments, oldest first) with their replies. */
export function groupThreads(comments: Comment[]): Thread[] {
  const replies = new Map<string, Comment[]>();
  for (const c of comments) if (c.parent_id) replies.set(c.parent_id, [...(replies.get(c.parent_id) ?? []), c]);
  return comments
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((c) => ({ ...c, replies: (replies.get(c.id) ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at)) }));
}

/** An http(s) link, or null. */
export function cleanUrl(raw: unknown): string | null {
  const v = String(raw ?? "").trim();
  if (!v) return "";
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}
