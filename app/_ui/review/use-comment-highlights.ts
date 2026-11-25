"use client";

import type { Editor } from "@tiptap/react";
import { useEffect, useMemo, useState } from "react";
import { resolveAnchor } from "@/lib/content/anchor";
import { docText, textRangeToDoc } from "@/lib/content/doc-text";
import { setCommentHighlights } from "@/lib/content/extensions";
import type { Thread } from "@/lib/content/types";

/**
 * Keeps the open threads highlighted in the editor, finding each quote again whenever the text
 * changes. Returns the ids of open threads whose quoted words are no longer in the script.
 */
export function useCommentHighlights(editor: Editor | null, threads: Thread[], activeId: string | null): Set<string> {
  const [docVersion, setDocVersion] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const bump = () => setDocVersion((v) => v + 1);
    editor.on("update", bump);
    return () => {
      editor.off("update", bump);
    };
  }, [editor]);

  const resolved = useMemo(() => {
    if (!editor) return { ranges: [], detached: new Set<string>() };
    const index = docText(editor.state.doc);
    const ranges: { id: string; from: number; to: number }[] = [];
    const detached = new Set<string>();
    for (const t of threads) {
      if (t.resolved_at || !t.quote) continue;
      const text = resolveAnchor(index.text, { quote: t.quote, prefix: t.prefix ?? "", suffix: t.suffix ?? "", from: t.anchor_from, to: t.anchor_to });
      const range = text ? textRangeToDoc(index, text.from, text.to) : null;
      if (range) ranges.push({ id: t.id, ...range });
      else detached.add(t.id);
    }
    return { ranges, detached };
    // docVersion re-runs this after every edit to the script.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, threads, docVersion]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    setCommentHighlights(
      editor.view,
      resolved.ranges.map((r) => ({ ...r, active: r.id === activeId })),
    );
  }, [editor, resolved, activeId]);

  return resolved.detached;
}
