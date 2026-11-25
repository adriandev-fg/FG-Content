"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { addComment, deleteContent, replyComment, resolveThread, saveContent } from "@/app/actions/content";
import { CommentPanel } from "@/app/_ui/review/comment-panel";
import { useCommentHighlights } from "@/app/_ui/review/use-comment-highlights";
import { Icon } from "@/app/_ui/icons";
import { btn, card, input, label, StatusBadge } from "@/app/_ui/ui";
import { Segmented } from "@/app/_ui/segmented";
import { docText } from "@/lib/content/doc-text";
import { editorExtensions } from "@/lib/content/extensions";
import { FORMATS, groupThreads, PLATFORMS, STATUSES, type Comment, type ContentItem, type ContentLink, type Format, type Platform, type Status } from "@/lib/content/types";
import { fill } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";

type Draft = {
  title: string;
  format: Format;
  platforms: Platform[];
  publishOn: string;
  publishTime: string;
  links: ContentLink[];
  publishedUrl: string;
};

const fromItem = (item: ContentItem): Draft => ({
  title: item.title,
  format: item.format,
  platforms: item.platforms,
  publishOn: item.publish_on ?? "",
  publishTime: item.publish_time ?? "",
  links: item.links.length ? item.links : [],
  publishedUrl: item.published_url,
});

/**
 * The team's side of one piece: the script in a rich text editor, its details, and the client's
 * comments next to it. Saving is explicit (button or Cmd/Ctrl+S); every status button saves first,
 * so a status never goes out with unsaved text.
 */
export function ContentEditor({ item, comments, businessName }: { item: ContentItem; comments: Comment[]; businessName: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => fromItem(item));
  const [status, setStatusState] = useState<Status>(item.status);
  const [updatedAt, setUpdatedAt] = useState(item.updated_at);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // A fresh server copy (after router.refresh) replaces local state only when nothing is unsaved.
  const lastServer = useRef(item.updated_at);
  useEffect(() => {
    if (item.updated_at !== lastServer.current && !dirty) {
      lastServer.current = item.updated_at;
      setDraft(fromItem(item));
      setUpdatedAt(item.updated_at);
    }
    setStatusState(item.status);
  }, [item, dirty]);

  const editor = useEditor({
    extensions: editorExtensions({ editable: true }),
    content: item.body,
    immediatelyRender: false,
    editorProps: { attributes: { class: "script-body min-h-[320px]", "aria-label": t.editor.placeholder } },
    onUpdate: () => setDirty(true),
  });

  const threads = useMemo(() => groupThreads(comments), [comments]);
  const detached = useCommentHighlights(editor, threads, activeId);

  const patch = (p: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...p }));
    setDirty(true);
  };

  const save = useCallback(
    (nextStatus?: Status) => {
      if (!editor) return;
      setError(null);
      setNote(null);
      startTransition(async () => {
        const res = await saveContent(item.id, {
          title: draft.title,
          body: editor.getJSON() as Record<string, unknown>,
          bodyText: docText(editor.state.doc).text,
          format: draft.format,
          platforms: draft.platforms,
          publishOn: draft.publishOn || null,
          publishTime: draft.publishTime || null,
          links: draft.links.filter((l) => l.url.trim()),
          publishedUrl: draft.publishedUrl,
          status: nextStatus,
          expectedUpdatedAt: updatedAt,
        });
        if (!res.ok) return setError(res.error);
        if (!nextStatus && status === "approved" && res.status === "in_review") setNote(t.editor.textChangedNote);
        lastServer.current = res.updatedAt;
        setUpdatedAt(res.updatedAt);
        setStatusState(res.status);
        setDirty(false);
        router.refresh();
      });
    },
    [editor, draft, item.id, updatedAt, status, router, t],
  );

  // Cmd/Ctrl+S saves; leaving with unsaved changes asks first.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty && !pending) save();
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [dirty, pending, save]);

  const primary: { label: string; status: Status; tone: string } | null =
    status === "draft" || status === "changes_requested"
      ? { label: t.editor.sendToClient, status: "in_review", tone: btn.accent }
      : status === "in_review"
        ? { label: t.editor.approveForClient, status: "approved", tone: btn.outline }
        : status === "approved"
          ? { label: t.editor.markPublished, status: "published", tone: btn.primary }
          : null;

  const approval = item.approved_by_kind && (status === "approved" || status === "published") ? (item.approved_by_name ? fill(t.editor.approvedBy, { name: item.approved_by_name }) : item.approved_by_kind === "team" ? t.editor.approvedByTeam : t.editor.approvedByClient) : null;

  return (
    <div className="grid gap-5">
      {/* The action bar stays in reach while the script scrolls. */}
      <div className={`${card} sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:top-4`}>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <StatusBadge status={status} t={t} />
          <span className="truncate text-[13px] font-semibold text-fg-muted">{businessName}</span>
          {approval && (
            <span className="inline-flex items-center gap-1 text-[13px] text-good">
              <Icon name="check" size={14} /> {approval}
            </span>
          )}
          <span className={`text-[13px] ${dirty ? "font-semibold text-accent-ink" : "text-fg-dim"}`} aria-live="polite">
            {pending ? t.common.saving : dirty ? t.editor.unsaved : t.editor.allSaved}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="status-select">
            {t.editor.status}
          </label>
          <select
            id="status-select"
            value={status}
            disabled={pending}
            onChange={(e) => save(e.target.value as Status)}
            className="h-11 rounded-lg border border-line-bright bg-raised px-2 text-[13px] font-semibold sm:h-10"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t.statuses[s]}
              </option>
            ))}
          </select>
          <button type="button" className={btn.outline} disabled={pending || !dirty} onClick={() => save()}>
            {t.common.save}
          </button>
          {primary && (
            <button type="button" className={primary.tone} disabled={pending} onClick={() => save(primary.status)}>
              {primary.label}
            </button>
          )}
        </div>
        {(error || note) && <p className={`basis-full text-sm ${error ? "text-bad" : "text-fg-muted"}`}>{error ?? note}</p>}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-5">
          <Details draft={draft} patch={patch} />

          <div className={`${card} min-w-0`}>
            <div className="border-b border-line px-5 pt-5 pb-4 sm:px-8">
              <label htmlFor="title" className="sr-only">
                {t.editor.titleLabel}
              </label>
              {/* A textarea that grows with the title, so a long one wraps instead of being cut off. */}
              <textarea
                id="title"
                rows={1}
                value={draft.title}
                ref={(el) => {
                  if (!el) return;
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }}
                onChange={(e) => patch({ title: e.target.value.replace(/\n/g, " ") })}
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                maxLength={300}
                className="block w-full resize-none overflow-hidden bg-transparent font-display text-[1.625rem] leading-tight font-[800] tracking-[-0.02em] outline-none placeholder:text-fg-dim sm:text-[2rem]"
              />
            </div>
            <Toolbar editor={editor} />
            <div
              className="px-5 py-6 sm:px-8"
              onClick={(e) => {
                const mark = (e.target as HTMLElement).closest("[data-thread-id]");
                if (mark) setActiveId(mark.getAttribute("data-thread-id"));
              }}
            >
              <EditorContent editor={editor} />
            </div>
          </div>

          <Links draft={draft} patch={patch} />

          {(status === "approved" || status === "published") && (
            <div className={`${card} grid gap-2 p-5`}>
              <label htmlFor="published-url" className={label}>
                {t.editor.publishedUrl}
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="published-url"
                  type="url"
                  inputMode="url"
                  value={draft.publishedUrl}
                  onChange={(e) => patch({ publishedUrl: e.target.value })}
                  placeholder={t.editor.publishedUrlPlaceholder}
                  className={`${input} min-w-0 flex-1 basis-64`}
                />
                {item.published_url && (
                  <a href={item.published_url} target="_blank" rel="noreferrer" className={btn.ghost}>
                    <Icon name="external" size={16} /> {t.review.viewLive}
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              className={btn.danger}
              disabled={pending}
              onClick={() => {
                if (!window.confirm(t.editor.deleteConfirm)) return;
                setDirty(false);
                startTransition(async () => {
                  const res = await deleteContent(item.id);
                  if (res && !res.ok) setError(res.error);
                });
              }}
            >
              {t.common.delete}
            </button>
          </div>
        </div>

        <CommentPanel
          threads={threads}
          detached={detached}
          activeId={activeId}
          onActivate={setActiveId}
          emptyHint={t.comments.emptyTeam}
          onGeneral={async (body) => {
            const res = await addComment(item.id, { body });
            if (!res.ok) return res.error;
            router.refresh();
            return null;
          }}
          onReply={async (threadId, body) => {
            const res = await replyComment(item.id, threadId, body);
            if (!res.ok) return res.error;
            router.refresh();
            return null;
          }}
          onResolve={async (threadId, resolved) => {
            const res = await resolveThread(item.id, threadId, resolved);
            if (!res.ok) return res.error;
            router.refresh();
            return null;
          }}
        />
      </div>
    </div>
  );
}

function Details({ draft, patch }: { draft: Draft; patch: (p: Partial<Draft>) => void }) {
  const { t } = useI18n();
  return (
    <fieldset className={`${card} grid gap-x-6 gap-y-4 p-5 sm:grid-cols-[auto_minmax(0,1fr)]`}>
      <legend className="sr-only">{t.editor.details}</legend>
      <div className="grid gap-1.5">
        <span className={label}>{t.newContent.format}</span>
        <Segmented options={FORMATS.map((f) => ({ value: f, label: t.formats[f] }))} value={draft.format} onChange={(v) => patch({ format: v as Format })} />
      </div>
      <div className="grid gap-1.5">
        <span className={label}>{t.newContent.platforms}</span>
        <div className="flex flex-wrap gap-1.5">
          {PLATFORMS.map((p) => {
            const on = draft.platforms.includes(p);
            return (
              <button
                key={p}
                type="button"
                aria-pressed={on}
                onClick={() => patch({ platforms: on ? draft.platforms.filter((x) => x !== p) : [...draft.platforms, p] })}
                className={`h-10 rounded-lg border px-3 text-[13px] font-semibold transition ${on ? "border-fg bg-fg text-ground" : "border-line-bright bg-raised text-fg-muted hover:border-fg"}`}
              >
                {t.platforms[p]}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,11rem)_8rem] gap-3 sm:col-span-2">
        <label className="grid gap-1.5">
          <span className={label}>{t.newContent.date}</span>
          <input type="date" value={draft.publishOn} onChange={(e) => patch({ publishOn: e.target.value })} className={input} />
        </label>
        <label className="grid gap-1.5">
          <span className={label}>{t.newContent.time}</span>
          <input type="time" value={draft.publishTime} disabled={!draft.publishOn} onChange={(e) => patch({ publishTime: e.target.value })} className={input} />
        </label>
      </div>
    </fieldset>
  );
}


function Links({ draft, patch }: { draft: Draft; patch: (p: Partial<Draft>) => void }) {
  const { t } = useI18n();
  const set = (i: number, p: Partial<ContentLink>) => patch({ links: draft.links.map((l, j) => (j === i ? { ...l, ...p } : l)) });
  return (
    <div className={`${card} grid gap-3 p-5`}>
      <div>
        <h2 className="flex items-center gap-2 text-[15px] font-bold">
          <Icon name="link" size={16} /> {t.editor.links}
        </h2>
        <p className="mt-0.5 text-[13px] text-fg-dim">{t.editor.linksHint}</p>
      </div>
      {draft.links.map((l, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[12rem_minmax(0,1fr)_auto]">
          <input aria-label={t.editor.linkLabel} value={l.label} onChange={(e) => set(i, { label: e.target.value })} placeholder={t.editor.linkLabelPlaceholder} className={input} maxLength={120} />
          <input aria-label={t.editor.linkUrl} type="url" inputMode="url" value={l.url} onChange={(e) => set(i, { url: e.target.value })} placeholder="https://drive.google.com/..." className={input} />
          <button type="button" className={btn.ghost} onClick={() => patch({ links: draft.links.filter((_, j) => j !== i) })}>
            {t.editor.removeLink}
          </button>
        </div>
      ))}
      <button type="button" className={`${btn.outline} justify-self-start`} onClick={() => patch({ links: [...draft.links, { label: "", url: "" }] })}>
        <Icon name="plus" size={16} /> {t.editor.addLink}
      </button>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  const { t } = useI18n();
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            heading: e.isActive("heading", { level: 3 }),
            bullets: e.isActive("bulletList"),
            numbers: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            undo: e.can().undo(),
            redo: e.can().redo(),
          }
        : null,
  });
  if (!editor || !state) return <div className="h-12 border-b border-line" />;
  const tools: { key: Exclude<keyof typeof t.editor.toolbar, "label">; text: string; active?: boolean; disabled?: boolean; run: () => void; className?: string }[] = [
    { key: "bold", text: "B", active: state.bold, run: () => editor.chain().focus().toggleBold().run(), className: "font-black" },
    { key: "italic", text: "I", active: state.italic, run: () => editor.chain().focus().toggleItalic().run(), className: "italic font-serif" },
    { key: "heading", text: "H", active: state.heading, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), className: "font-black" },
    { key: "bullets", text: "•", active: state.bullets, run: () => editor.chain().focus().toggleBulletList().run(), className: "text-lg" },
    { key: "numbers", text: "1.", active: state.numbers, run: () => editor.chain().focus().toggleOrderedList().run() },
    { key: "quote", text: "“", active: state.quote, run: () => editor.chain().focus().toggleBlockquote().run(), className: "text-lg" },
    { key: "undo", text: "↶", disabled: !state.undo, run: () => editor.chain().focus().undo().run() },
    { key: "redo", text: "↷", disabled: !state.redo, run: () => editor.chain().focus().redo().run() },
  ];
  return (
    <div role="toolbar" aria-label={t.editor.toolbar.label} className="flex flex-wrap gap-0.5 border-b border-line px-3 py-1.5 sm:px-6">
      {tools.map((tool, i) => (
        <span key={tool.key} className="contents">
          {i === 6 && <span aria-hidden className="mx-1 w-px self-stretch bg-line" />}
          <button
            type="button"
            title={t.editor.toolbar[tool.key]}
            aria-label={t.editor.toolbar[tool.key]}
            aria-pressed={tool.active}
            disabled={tool.disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={tool.run}
            className={`grid size-9 place-items-center rounded-md text-sm transition disabled:opacity-30 ${tool.active ? "bg-fg text-ground" : "text-fg-muted hover:bg-sunk hover:text-fg"} ${tool.className ?? ""}`}
          >
            {tool.text}
          </button>
        </span>
      ))}
    </div>
  );
}
