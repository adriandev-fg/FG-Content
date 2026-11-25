import { Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

/**
 * The editor setup shared by the team's editor and the client's review page. One list on purpose:
 * comment anchors are measured in the document's text, so both sides must read a script the same way.
 *
 * `CommentHighlights` paints open comment threads onto the text. React owns the ranges (found from each
 * thread's quote) and pushes them with `setCommentHighlights`; between pushes the marks follow edits.
 * Each carries data-thread-id, so a click on it opens its thread.
 */

export type HighlightRange = { id: string; from: number; to: number; active: boolean };

const highlightsKey = new PluginKey<DecorationSet>("fgcCommentHighlights");

const CommentHighlights = Extension.create({
  name: "fgcCommentHighlights",
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: highlightsKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, set) {
            const ranges = tr.getMeta(highlightsKey) as HighlightRange[] | undefined;
            if (!ranges) return set.map(tr.mapping, tr.doc);
            return DecorationSet.create(
              tr.doc,
              ranges.map((r) => Decoration.inline(r.from, r.to, { class: r.active ? "comment-mark is-active" : "comment-mark", "data-thread-id": r.id })),
            );
          },
        },
        props: { decorations: (state) => highlightsKey.getState(state) },
      }),
    ];
  },
});

export function setCommentHighlights(view: EditorView, ranges: HighlightRange[]) {
  view.dispatch(view.state.tr.setMeta(highlightsKey, ranges).setMeta("addToHistory", false));
}

export const editorExtensions = (opts: { editable: boolean }) => [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    codeBlock: false,
    code: false,
    horizontalRule: false,
    link: opts.editable ? { openOnClick: false, autolink: true } : { openOnClick: true },
  }),
  CommentHighlights,
];

/** A starting document for a format, from the copy's template (["h", "Hook"], ["p", ""], ...). */
export function templateDoc(rows: string[][]): Record<string, unknown> {
  return {
    type: "doc",
    content: rows.map(([kind, text]) =>
      kind === "h"
        ? { type: "heading", attrs: { level: 3 }, content: text ? [{ type: "text", text }] : [] }
        : { type: "paragraph", content: text ? [{ type: "text", text }] : [] },
    ),
  };
}

/** Plain text of a template, the same way docText reads it (blocks joined by a newline). */
export const templateText = (rows: string[][]) => rows.map(([, text]) => text).join("\n");
