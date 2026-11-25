/**
 * Starting documents for each format, from the copy's templates (["h", "Hook"], ["p", ""], ...).
 * Plain data, no Tiptap import: server actions use it, and @tiptap/react can't load on the server.
 */

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

/** Plain text of a template, the way docText reads it (blocks joined by a newline). */
export const templateText = (rows: string[][]) => rows.map(([, text]) => text).join("\n");
