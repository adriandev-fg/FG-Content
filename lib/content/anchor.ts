/**
 * Comment anchors for content review. A thread stores the quoted text plus a little context on each
 * side, measured in the post's plain text (`docText` in doc-text.ts). When the team edits the script
 * the stored offsets go stale, so `resolveAnchor` finds the quote again by its text. Pure, so it's
 * easy to test and shared by client components and server actions.
 */

export const ANCHOR_CONTEXT = 32;
export const MAX_QUOTE = 4000;

export type Anchor = {
  quote: string;
  prefix: string;
  suffix: string;
  from: number | null;
  to: number | null;
};

export type TextRange = { from: number; to: number };

/** The quote and its context for [from, to) in `text`, or null for an empty, out-of-range or too long span. */
export function buildAnchor(text: string, from: number, to: number): Anchor | null {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to > text.length || from >= to || to - from > MAX_QUOTE) return null;
  const quote = text.slice(from, to);
  if (!quote.trim()) return null;
  return {
    quote,
    prefix: text.slice(Math.max(0, from - ANCHOR_CONTEXT), from),
    suffix: text.slice(to, to + ANCHOR_CONTEXT),
    from,
    to,
  };
}

function occurrences(text: string, needle: string): number[] {
  const found: number[] = [];
  if (!needle) return found;
  let at = text.indexOf(needle);
  while (at !== -1) {
    found.push(at);
    at = text.indexOf(needle, at + 1);
  }
  return found;
}

/**
 * Where the quote sits in `text` now, or null when the words are gone (the thread then shows "text
 * changed"). Tries, in order: the stored offsets; the quote with both context sides; with either
 * side; the occurrence nearest the old offset.
 */
export function resolveAnchor(text: string, anchor: Anchor): TextRange | null {
  const { quote, prefix, suffix } = anchor;
  if (!quote) return null;
  if (anchor.from != null && anchor.to != null && text.slice(anchor.from, anchor.to) === quote) return { from: anchor.from, to: anchor.to };
  const hits = occurrences(text, quote);
  if (hits.length === 0) return null;
  const range = (at: number) => ({ from: at, to: at + quote.length });
  if (hits.length === 1) return range(hits[0]);

  const before = (at: number) => text.slice(Math.max(0, at - prefix.length), at);
  const after = (at: number) => text.slice(at + quote.length, at + quote.length + suffix.length);
  const both = hits.find((at) => before(at) === prefix && after(at) === suffix);
  if (both != null) return range(both);
  const either = hits.find((at) => (prefix && before(at) === prefix) || (suffix && after(at) === suffix));
  if (either != null) return range(either);

  const origin = anchor.from ?? 0;
  return range(hits.reduce((best, at) => (Math.abs(at - origin) < Math.abs(best - origin) ? at : best)));
}
