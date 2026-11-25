"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { fmtDateTime } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/config";
import type { Comment, Thread } from "@/lib/content/types";

/** Every mutation returns an error message, or null on success. */
type Mutation<A extends unknown[]> = (...args: A) => Promise<string | null>;

const smallButton = "h-9 rounded-lg bg-fg px-3.5 text-[13px] font-semibold text-ground transition hover:bg-accent-deep disabled:opacity-50";
const ghostButton = "h-9 rounded-lg px-3 text-[13px] font-semibold text-fg-muted transition hover:text-fg disabled:opacity-50";
const linkButton = "min-h-8 text-[13px] font-semibold text-accent-ink hover:underline underline-offset-2 disabled:opacity-50";
const textareaClass =
  "min-h-[76px] w-full resize-y rounded-lg border border-line-bright bg-raised px-3 py-2 text-sm outline-none transition placeholder:text-fg-dim focus:border-fg focus:ring-4 focus:ring-accent/15";

/**
 * The comment column shared by the team's editor and the client's review. Threads are anchored to
 * quoted text; clicking one marks its text in the script, and clicking marked text opens its thread.
 * Adapted from Meristoll's blog review.
 */
export function CommentPanel({
  threads,
  detached,
  activeId,
  onActivate,
  composerQuote,
  onSubmitComposer,
  onCancelComposer,
  onGeneral,
  onReply,
  onResolve,
  readOnlyNote,
  emptyHint,
  guide,
}: {
  threads: Thread[];
  detached: Set<string>;
  activeId: string | null;
  onActivate: (id: string | null) => void;
  composerQuote?: string | null;
  onSubmitComposer?: Mutation<[string]>;
  onCancelComposer?: () => void;
  /** A comment on the whole piece, with no quote. */
  onGeneral?: Mutation<[string]>;
  onReply: Mutation<[string, string]>;
  /** The team only: resolve or reopen a thread. */
  onResolve?: Mutation<[string, boolean]>;
  readOnlyNote?: string | null;
  emptyHint: string;
  guide?: ReactNode;
}) {
  const { t } = useI18n();
  const open = threads.filter((x) => !x.resolved_at);
  const resolved = threads.filter((x) => x.resolved_at);
  const [general, setGeneral] = useState(false);

  return (
    <aside className="grid content-start gap-3 xl:sticky xl:top-6 xl:max-h-[calc(100dvh-3rem)] xl:overflow-y-auto xl:pb-1">
      <h2 className="flex items-center justify-between text-xs font-bold tracking-[0.08em] text-fg-dim uppercase">
        <span>{t.comments.heading}</span>
        {open.length > 0 && <span className="tabular rounded-full bg-accent-soft px-2.5 py-0.5 tracking-normal text-accent-ink normal-case">{fill(t.comments.open, { n: open.length })}</span>}
      </h2>
      {guide && <div className="rounded-xl border border-line bg-sunk px-4 py-3 text-sm">{guide}</div>}
      {readOnlyNote && <p className="text-sm text-fg-muted">{readOnlyNote}</p>}
      {composerQuote && onSubmitComposer && onCancelComposer && <NewComment quote={composerQuote} onSubmit={onSubmitComposer} onCancel={onCancelComposer} />}
      {general && onGeneral && (
        <NewComment
          quote={null}
          onSubmit={async (body) => {
            const err = await onGeneral(body);
            if (!err) setGeneral(false);
            return err;
          }}
          onCancel={() => setGeneral(false)}
        />
      )}
      {open.length === 0 && !composerQuote && !general && <p className="text-sm text-fg-muted">{emptyHint}</p>}
      {open.map((th) => (
        <ThreadCard key={th.id} thread={th} detached={detached.has(th.id)} active={th.id === activeId} onActivate={onActivate} onReply={readOnlyNote ? undefined : onReply} onResolve={onResolve} />
      ))}
      {onGeneral && !readOnlyNote && !general && (
        <button type="button" className={`${linkButton} justify-self-start`} onClick={() => setGeneral(true)}>
          + {t.comments.addGeneral}
        </button>
      )}
      {resolved.length > 0 && (
        <details>
          <summary className="cursor-pointer py-1 text-sm font-semibold text-fg-muted">{fill(t.comments.resolved, { n: resolved.length })}</summary>
          <div className="mt-2 grid gap-3">
            {resolved.map((th) => (
              <ThreadCard key={th.id} thread={th} detached={false} active={false} onActivate={onActivate} onResolve={onResolve} />
            ))}
          </div>
        </details>
      )}
    </aside>
  );
}

function NewComment({ quote, onSubmit, onCancel }: { quote: string | null; onSubmit: Mutation<[string]>; onCancel: () => void }) {
  const { t } = useI18n();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  // On a phone the column sits under the script, out of sight when the button is pressed.
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);
  const submit = () => {
    setError(null);
    startTransition(async () => {
      const err = await onSubmit(body);
      if (err) setError(err);
      else setBody("");
    });
  };
  return (
    <div ref={ref} className="grid gap-2 rounded-xl border border-accent/50 bg-raised p-3 shadow-sm">
      {quote ? <Quote text={quote} /> : <p className="text-[11px] font-bold tracking-wider text-fg-dim uppercase">{t.comments.wholePiece}</p>}
      <textarea
        autoFocus
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && body.trim()) submit();
        }}
        maxLength={4000}
        placeholder={t.comments.placeholder}
        aria-label={t.comments.placeholder}
        className={textareaClass}
      />
      {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-xs text-bad">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={smallButton} disabled={pending || !body.trim()} onClick={submit}>
          {pending ? t.comments.posting : t.comments.comment}
        </button>
        <button type="button" className={ghostButton} disabled={pending} onClick={onCancel}>
          {t.comments.cancel}
        </button>
      </div>
    </div>
  );
}

const Quote = ({ text }: { text: string }) => <p className="line-clamp-3 border-l-[3px] border-accent/60 pl-2 text-[13px] leading-relaxed text-fg-muted">{text}</p>;

function ThreadCard({
  thread,
  detached,
  active,
  onActivate,
  onReply,
  onResolve,
}: {
  thread: Thread;
  detached: boolean;
  active: boolean;
  onActivate: (id: string | null) => void;
  onReply?: Mutation<[string, string]>;
  onResolve?: Mutation<[string, boolean]>;
}) {
  const { t } = useI18n();
  const [replying, setReplying] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<string | null>, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const err = await fn();
      if (err) setError(err);
      else after?.();
    });
  };

  return (
    <div
      onClick={() => onActivate(thread.id)}
      className={`grid cursor-pointer gap-2 rounded-xl border bg-raised p-3 transition ${active ? "border-accent shadow-sm" : "border-line hover:border-line-bright"} ${thread.resolved_at ? "opacity-75" : ""}`}
    >
      {thread.quote ? <Quote text={thread.quote} /> : <p className="text-[11px] font-bold tracking-wider text-fg-dim uppercase">{t.comments.wholePiece}</p>}
      {detached && <p className="w-fit rounded-full bg-sunk px-2.5 py-0.5 text-xs font-semibold text-fg-muted">{t.comments.textChanged}</p>}
      <CommentLine comment={thread} />
      {thread.replies.map((r) => (
        <div key={r.id} className="border-t border-line pt-2">
          <CommentLine comment={r} />
        </div>
      ))}
      {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-xs text-bad">{error}</p>}
      {replying && onReply ? (
        <div className="grid gap-2" onClick={(e) => e.stopPropagation()}>
          <textarea autoFocus value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} placeholder={t.comments.replyPlaceholder} aria-label={t.comments.replyPlaceholder} className={textareaClass} />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={smallButton}
              disabled={pending || !body.trim()}
              onClick={() =>
                run(
                  () => onReply(thread.id, body),
                  () => {
                    setBody("");
                    setReplying(false);
                  },
                )
              }
            >
              {pending ? t.comments.sending : t.comments.reply}
            </button>
            <button type="button" className={ghostButton} disabled={pending} onClick={() => setReplying(false)}>
              {t.comments.cancel}
            </button>
          </div>
        </div>
      ) : (
        (onReply || onResolve) && (
          <div className="flex flex-wrap items-center gap-4" onClick={(e) => e.stopPropagation()}>
            {onReply && !thread.resolved_at && (
              <button type="button" className={linkButton} onClick={() => setReplying(true)}>
                {t.comments.reply}
              </button>
            )}
            {onResolve && (
              <button type="button" className={linkButton} disabled={pending} onClick={() => run(() => onResolve(thread.id, !thread.resolved_at))}>
                {thread.resolved_at ? t.comments.reopen : t.comments.resolve}
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
}

function CommentLine({ comment }: { comment: Comment }) {
  const { t, locale } = useI18n();
  return (
    <div className="grid gap-0.5">
      <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-fg-dim">
        <strong className="text-[13px] text-fg">{comment.author_name || (comment.author_kind === "team" ? t.comments.team : t.comments.client)}</strong>
        {comment.author_kind === "team" && <span className="rounded-full bg-accent-soft px-2 py-px font-semibold text-accent-ink">{t.comments.team}</span>}
        <span className="tabular">{fmtDateTime(comment.created_at, locale)}</span>
      </div>
      <p className="text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap">{comment.body}</p>
    </div>
  );
}
