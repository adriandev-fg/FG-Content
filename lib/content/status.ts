import type { Status } from "./types";

/**
 * Who may move a piece between statuses. Draft (team only) -> waiting for client -> approved ->
 * published, with "changes requested" whenever the client comments or asks for changes. Either side
 * can approve: the client, or the team when the client says "just post it". Pure, so it's tested and
 * shared by the pages and the server actions. Adapted from Meristoll's blog review.
 */

/** What needs attention first. */
export const STATUS_ORDER: readonly Status[] = ["changes_requested", "in_review", "approved", "draft", "published"];

/** Tailwind classes per status (tokens from globals.css). */
export const STATUS_TONE: Record<Status, string> = {
  draft: "bg-sunk text-fg-muted",
  in_review: "bg-info-soft text-info",
  changes_requested: "bg-accent-soft text-accent-ink",
  approved: "bg-good-soft text-good",
  published: "bg-fg text-ground",
};

/** Calendar dots and bars. */
export const STATUS_DOT: Record<Status, string> = {
  draft: "bg-line-bright",
  in_review: "bg-info",
  changes_requested: "bg-accent",
  approved: "bg-good",
  published: "bg-fg",
};

/** The client never sees a draft. */
export const clientCanSee = (s: Status) => s !== "draft";

/** The client can comment and decide until the piece is out. */
export const clientCanAct = (s: Status) => s === "in_review" || s === "changes_requested" || s === "approved";

/** The client's two decisions. */
export function canClientSet(current: Status, next: unknown): next is "approved" | "changes_requested" {
  if (!clientCanAct(current) || current === next) return false;
  return next === "approved" || next === "changes_requested";
}

/** The columns a status move changes: the approval is kept only while the piece stays approved or goes out. */
export function statusFields(next: Status, by: { kind: "client" | "team"; name: string }, now: string, current?: Status) {
  const keepApproval = next === "published" && current === "approved";
  return {
    status: next,
    status_changed_at: now,
    ...(next === "approved"
      ? { approved_at: now, approved_by_kind: by.kind, approved_by_name: by.name }
      : keepApproval
        ? {}
        : next === "published"
          ? { approved_at: now, approved_by_kind: by.kind, approved_by_name: by.name }
          : { approved_at: null, approved_by_kind: null, approved_by_name: "" }),
  };
}

/**
 * What a team save does to the status. A status the team picked wins. Otherwise new text on an
 * approved piece sends it back to the client: the approval covered the old words.
 */
export function statusAfterSave(current: Status, picked: Status | undefined, textChanged: boolean): Status | null {
  if (picked && picked !== current) return picked;
  if (current === "approved" && textChanged) return "in_review";
  return null;
}
