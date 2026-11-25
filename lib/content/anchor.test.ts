import { describe, expect, it } from "vitest";
import { ANCHOR_CONTEXT, MAX_QUOTE, buildAnchor, resolveAnchor } from "./anchor";

const text = "The roof costs money. The roof lasts years. Ask about the roof today.";

describe("buildAnchor", () => {
  it("keeps the quote and its context", () => {
    const a = buildAnchor(text, 22, 30)!;
    expect(a.quote).toBe("The roof");
    expect(a.prefix).toBe("The roof costs money. ");
    expect(a.suffix.length).toBeLessThanOrEqual(ANCHOR_CONTEXT);
  });
  it("refuses empty, blank, out-of-range and over-long spans", () => {
    expect(buildAnchor(text, 5, 5)).toBeNull();
    expect(buildAnchor("a   b", 1, 4)).toBeNull();
    expect(buildAnchor(text, -1, 3)).toBeNull();
    expect(buildAnchor(text, 0, text.length + 1)).toBeNull();
    expect(buildAnchor("x".repeat(MAX_QUOTE + 2), 0, MAX_QUOTE + 1)).toBeNull();
  });
});

describe("resolveAnchor", () => {
  const anchor = buildAnchor(text, 22, 30)!;
  it("uses the offsets while they still hold", () => {
    expect(resolveAnchor(text, anchor)).toEqual({ from: 22, to: 30 });
  });
  it("finds the same occurrence by its context after text is added before it", () => {
    const edited = `A new opening line. ${text}`;
    const r = resolveAnchor(edited, anchor)!;
    expect(edited.slice(r.from, r.to)).toBe("The roof");
    expect(r.from).toBe(22 + "A new opening line. ".length);
  });
  it("falls back to the nearest occurrence when the context changed", () => {
    const edited = "The roof. Something else entirely. The roof.";
    const r = resolveAnchor(edited, { ...anchor, prefix: "zzz", suffix: "zzz", from: 40, to: 48 })!;
    expect(r.from).toBe(35);
  });
  it("gives null when the words are gone", () => {
    expect(resolveAnchor("Nothing like it here.", anchor)).toBeNull();
  });
});
