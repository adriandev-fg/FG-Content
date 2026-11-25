"use client";

import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useState, type RefObject } from "react";
import { buildAnchor, type Anchor } from "@/lib/content/anchor";
import { docRangeToText, docText } from "@/lib/content/doc-text";

export type PendingComment = Anchor & { from: number; to: number };
type Floating = PendingComment & { x: number; y: number; below: boolean };

/**
 * The "Comment" button for a text selection in the script. Call `read` on mouseup and keyup of
 * `containerRef` (which must be position: relative); it measures the selection in the post's plain
 * text, so the anchor matches what `resolveAnchor` later looks for. A phone selects with a long
 * press, which fires neither, so touch screens follow the selection itself, and the button sits
 * under it there, clear of the phone's own copy menu.
 */
export function useSelectionComment(editor: Editor | null, containerRef: RefObject<HTMLElement | null>, enabled: boolean) {
  const [floating, setFloating] = useState<Floating | null>(null);

  const read = useCallback(() => {
    const sel = window.getSelection();
    const container = containerRef.current;
    if (!enabled || !editor || !container || !sel || sel.isCollapsed || sel.rangeCount === 0) return setFloating(null);
    const range = sel.getRangeAt(0);
    if (!editor.view.dom.contains(range.commonAncestorContainer)) return setFloating(null);
    const from = editor.view.posAtDOM(range.startContainer, range.startOffset);
    const to = editor.view.posAtDOM(range.endContainer, range.endOffset);
    const index = docText(editor.state.doc);
    const text = docRangeToText(index, Math.min(from, to), Math.max(from, to));
    const anchor = text ? buildAnchor(index.text, text.from, text.to) : null;
    if (!text || !anchor) return setFloating(null);
    const rect = range.getBoundingClientRect();
    const box = container.getBoundingClientRect();
    const below = window.matchMedia("(pointer: coarse)").matches;
    const x = Math.min(Math.max(rect.left + rect.width / 2 - box.left, 60), box.width - 60);
    setFloating({ ...anchor, from: text.from, to: text.to, x, y: (below ? rect.bottom : rect.top) - box.top, below });
  }, [editor, containerRef, enabled]);

  useEffect(() => {
    if (!enabled || !window.matchMedia("(pointer: coarse)").matches) return;
    let timer: ReturnType<typeof setTimeout>;
    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(read, 250);
    };
    document.addEventListener("selectionchange", onChange);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("selectionchange", onChange);
    };
  }, [enabled, read]);

  return { floating, read, clear: () => setFloating(null) };
}

export function FloatingCommentButton({ floating, label, onClick }: { floating: { x: number; y: number; below: boolean } | null; label: string; onClick: () => void }) {
  if (!floating) return null;
  return (
    <button
      type="button"
      className={`absolute z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-lg bg-fg px-3 py-2 text-[13px] font-bold whitespace-nowrap text-ground shadow-lg transition hover:bg-accent-deep ${floating.below ? "translate-y-2" : "-translate-y-[calc(100%+8px)]"}`}
      style={{ left: floating.x, top: floating.y }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current stroke-2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      {label}
    </button>
  );
}
