"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { addComment, clientDecide, replyComment } from "@/app/actions/content";
import { CommentPanel } from "@/app/_ui/review/comment-panel";
import { useCommentHighlights } from "@/app/_ui/review/use-comment-highlights";
import { FloatingCommentButton, useSelectionComment } from "@/app/_ui/review/use-selection-comment";
import { Icon } from "@/app/_ui/icons";
import { btn, card, StatusBadge } from "@/app/_ui/ui";
import { editorExtensions } from "@/lib/content/extensions";
import { clientCanAct } from "@/lib/content/status";
import { groupThreads, type Comment, type ContentItem } from "@/lib/content/types";
import { useI18n } from "@/lib/i18n/client";

type Selection = { from: number; to: number; quote: string };

/**
 * The client's review of one piece: the script, read-only; highlight words to comment on them
 * (Google Docs style); approve it or ask for changes. Any comment hands the piece back to the team.
 * `preview` is an admin looking at the client's view: everything shows, nothing can be done.
 */
export function ContentReview({ item, comments, preview, meta }: { item: ContentItem; comments: Comment[]; preview: boolean; meta: React.ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const paperRef = useRef<HTMLDivElement>(null);
  const [composer, setComposer] = useState<Selection | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [pending, startTransition] = useTransition();
  const canAct = !preview && clientCanAct(item.status);

  const editor = useEditor({
    editable: false,
    extensions: editorExtensions({ editable: false }),
    content: item.body,
    immediatelyRender: false,
    editorProps: { attributes: { class: "script-body" } },
  });
  // The text changes when the team saves; show the new words.
  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.commands.setContent(item.body, { emitUpdate: true });
  }, [editor, item.body]);

  const threads = useMemo(() => groupThreads(comments), [comments]);
  const detached = useCommentHighlights(editor, threads, activeId);
  const selection = useSelectionComment(editor, paperRef, canAct);

  const decide = (status: "approved" | "changes_requested", note?: string) => {
    setStatusError(null);
    startTransition(async () => {
      const res = await clientDecide(item.id, status, note);
      if (!res.ok) return setStatusError(res.error);
      setRequesting(false);
      router.refresh();
    });
  };

  const hint =
    item.status === "published" ? t.review.hintPublished : item.status === "approved" ? t.review.hintApproved : item.status === "changes_requested" ? t.review.hintChanges : t.review.hintReview;

  const actions = canAct && (
    <>
      {item.status !== "changes_requested" && (
        <button
          type="button"
          className={btn.outline}
          disabled={pending}
          onClick={() => {
            setStatusError(null);
            setRequesting(true);
          }}
        >
          {t.review.requestChanges}
        </button>
      )}
      {item.status !== "approved" && (
        <button type="button" className={btn.accent} disabled={pending} onClick={() => decide("approved")}>
          <Icon name="check" size={16} />
          {pending ? t.common.saving : t.review.approve}
        </button>
      )}
    </>
  );
  const openThreads = threads.filter((x) => !x.resolved_at).length;

  return (
    <div className="grid gap-5">
      {preview && <p className="rounded-lg bg-info-soft px-4 py-2.5 text-sm text-info">{t.review.previewNote}</p>}
      <div className={`${card} flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:sticky lg:top-4 lg:z-10`}>
        <div className="grid min-w-0 flex-1 basis-80 gap-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatusBadge status={item.status} t={t} client />
            {meta}
          </div>
          <p className="text-sm text-fg-muted">{hint}</p>
          {statusError && !requesting && <p className="text-sm text-bad">{statusError}</p>}
        </div>
        <div className="hidden flex-wrap items-center gap-2 lg:flex">{actions}</div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-5">
          <div ref={paperRef} className={`${card} relative min-w-0 p-5 sm:p-8`} onMouseUp={selection.read} onKeyUp={selection.read}>
            <h1 className="font-display text-[1.625rem] leading-tight font-[800] tracking-[-0.02em] break-words sm:text-[2rem]">{item.title}</h1>
            {item.published_url && (
              <a href={item.published_url} target="_blank" rel="noreferrer" className={`${btn.link} mt-2 inline-flex items-center gap-1 text-sm`}>
                <Icon name="external" size={14} /> {t.review.viewLive}
              </a>
            )}
            {canAct && <p className="mt-2 text-sm text-fg-dim">{t.review.highlightHint}</p>}
            <div
              className="mt-6 border-t border-line pt-6"
              onClick={(e) => {
                const mark = (e.target as HTMLElement).closest("[data-thread-id]");
                if (!mark) return;
                setActiveId(mark.getAttribute("data-thread-id"));
                // Below the wide layout the comments sit under the text: go to the one tapped.
                if (window.matchMedia("(max-width: 1279px)").matches) document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <EditorContent editor={editor} />
            </div>
            <FloatingCommentButton
              floating={selection.floating}
              label={t.comments.comment}
              onClick={() => {
                const f = selection.floating;
                if (!f) return;
                setComposer({ from: f.from, to: f.to, quote: f.quote });
                setActiveId(null);
                selection.clear();
              }}
            />
          </div>
          {item.links.length > 0 && <LinkList links={item.links} />}
        </div>

        <div id="comments" className="min-w-0 scroll-mt-20">
          <CommentPanel
            threads={threads}
            detached={detached}
            activeId={activeId}
            onActivate={setActiveId}
            composerQuote={composer?.quote ?? null}
            onCancelComposer={() => setComposer(null)}
            onSubmitComposer={async (body) => {
              if (!composer) return null;
              const res = await addComment(item.id, { ...composer, body });
              if (!res.ok) return res.error;
              setComposer(null);
              router.refresh();
              return null;
            }}
            onGeneral={canAct ? async (body) => {
              const res = await addComment(item.id, { body });
              if (!res.ok) return res.error;
              router.refresh();
              return null;
            } : undefined}
            onReply={async (threadId, body) => {
              const res = await replyComment(item.id, threadId, body);
              if (!res.ok) return res.error;
              router.refresh();
              return null;
            }}
            readOnlyNote={preview ? t.review.previewNote : item.status === "published" ? t.comments.readOnly : null}
            emptyHint={t.comments.empty}
            guide={
              canAct ? (
                <>
                  <p className="font-semibold">{t.comments.guideTitle}</p>
                  <ol className="mt-1.5 grid list-decimal gap-1 pl-5 text-fg-muted">
                    <li>{t.comments.guide1}</li>
                    <li>{t.comments.guide2}</li>
                    <li>{t.comments.guide3}</li>
                  </ol>
                </>
              ) : undefined
            }
          />
        </div>
      </div>

      {/* On a phone the decision stays in reach of a thumb, above the tabs, however long the script is. */}
      {canAct && (
        <>
          <div className="h-16 lg:hidden" aria-hidden />
          <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 flex items-center gap-2 border-t border-line bg-raised/95 px-4 py-2.5 backdrop-blur lg:hidden">
            <a href="#comments" aria-label={t.comments.heading} className="mr-auto inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-fg-muted">
              <Icon name="chat" size={20} />
              {openThreads > 0 && <span className="tabular grid h-5 min-w-5 place-items-center rounded-full bg-accent-soft px-1.5 text-xs text-accent-ink">{openThreads}</span>}
            </a>
            {actions}
          </div>
        </>
      )}
      <RequestChangesDialog open={requesting} loading={pending} error={requesting ? statusError : null} onSubmit={(note) => decide("changes_requested", note)} onCancel={() => setRequesting(false)} />
    </div>
  );
}

export function LinkList({ links }: { links: { label: string; url: string }[] }) {
  const { t } = useI18n();
  return (
    <div className={`${card} grid gap-2 p-5`}>
      <h2 className="flex items-center gap-2 text-[15px] font-bold">
        <Icon name="link" size={16} /> {t.editor.links}
      </h2>
      <ul className="grid gap-1">
        {links.map((l, i) => (
          <li key={i}>
            <a href={l.url} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold break-all text-accent-ink underline-offset-2 hover:underline">
              <Icon name="external" size={14} />
              {l.label || new URL(l.url).hostname}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "Ask for changes" asks for a note, saved as a comment on the whole piece. */
function RequestChangesDialog({ open, loading, error, onSubmit, onCancel }: { open: boolean; loading: boolean; error: string | null; onSubmit: (note: string) => void; onCancel: () => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  const canSubmit = Boolean(note.trim()) && !loading;

  return (
    <dialog
      ref={ref}
      aria-labelledby="changes-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCancel();
      }}
      className="fixed top-1/2 left-1/2 m-0 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border-0 bg-raised p-0 text-fg shadow-2xl backdrop:bg-deep/40"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) onSubmit(note.trim());
        }}
        className="grid gap-3 p-6"
      >
        <h2 id="changes-title" className="font-display text-xl font-[800] tracking-tight">
          {t.review.dialogTitle}
        </h2>
        <p className="text-sm text-fg-muted">{t.review.dialogIntro}</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          required
          autoFocus
          maxLength={4000}
          placeholder={t.review.dialogPlaceholder}
          aria-label={t.review.dialogTitle}
          className="min-h-32 w-full resize-y rounded-lg border border-line-bright bg-raised px-3 py-2 text-[15px] outline-none focus:border-fg focus:ring-4 focus:ring-accent/15"
        />
        {error && <p className="text-sm text-bad">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={btn.ghost} disabled={loading} onClick={onCancel}>
            {t.common.cancel}
          </button>
          <button type="submit" className={btn.primary} disabled={!canSubmit}>
            {loading ? t.review.sending : t.review.send}
          </button>
        </div>
      </form>
    </dialog>
  );
}
