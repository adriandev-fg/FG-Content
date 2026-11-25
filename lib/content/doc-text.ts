import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

/**
 * The plain text of a script as comment anchors measure it, plus the editor position of every
 * character. Blocks are joined by a single newline. The team saves `text` as fgc_content.body_text,
 * and the client review anchors comments against the same function, so offsets agree on both sides.
 */

export type DocText = { text: string; positions: number[] };

export function docText(doc: ProseMirrorNode): DocText {
  let text = "";
  const positions: number[] = [];
  let first = true;
  doc.descendants((node, pos) => {
    if (node.isTextblock) {
      if (!first) {
        text += "\n";
        positions.push(pos);
      }
      first = false;
      return true;
    }
    if (node.isText) {
      const value = node.text ?? "";
      for (let i = 0; i < value.length; i++) positions.push(pos + i);
      text += value;
      return false;
    }
    if (node.type.name === "hardBreak") {
      text += "\n";
      positions.push(pos);
      return false;
    }
    return true;
  });
  return { text, positions };
}

/** Editor range for text offsets [from, to). */
export function textRangeToDoc(index: DocText, from: number, to: number): { from: number; to: number } | null {
  if (from < 0 || to > index.positions.length || from >= to) return null;
  return { from: index.positions[from], to: index.positions[to - 1] + 1 };
}

/** Text offsets for an editor range, trimmed to the characters actually inside it. */
export function docRangeToText(index: DocText, from: number, to: number): { from: number; to: number } | null {
  const { positions } = index;
  let start = 0;
  while (start < positions.length && positions[start] < from) start++;
  let end = start;
  while (end < positions.length && positions[end] < to) end++;
  return end > start ? { from: start, to: end } : null;
}
