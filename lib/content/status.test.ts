import { describe, expect, it } from "vitest";
import { canClientSet, clientCanAct, clientCanSee, statusAfterSave, statusFields } from "./status";

describe("client rules", () => {
  it("hides drafts and locks published pieces", () => {
    expect(clientCanSee("draft")).toBe(false);
    expect(clientCanSee("in_review")).toBe(true);
    expect(clientCanAct("published")).toBe(false);
    expect(clientCanAct("approved")).toBe(true);
  });
  it("only lets the client approve or ask for changes", () => {
    expect(canClientSet("in_review", "approved")).toBe(true);
    expect(canClientSet("in_review", "changes_requested")).toBe(true);
    expect(canClientSet("in_review", "published")).toBe(false);
    expect(canClientSet("approved", "approved")).toBe(false);
    expect(canClientSet("draft", "approved")).toBe(false);
  });
});

describe("statusFields", () => {
  const now = "2026-11-25T10:00:00.000Z";
  it("records who approved", () => {
    expect(statusFields("approved", { kind: "client", name: "Ann" }, now)).toMatchObject({ approved_by_kind: "client", approved_by_name: "Ann", approved_at: now });
  });
  it("clears the approval when the piece goes back", () => {
    expect(statusFields("in_review", { kind: "team", name: "" }, now)).toMatchObject({ approved_at: null, approved_by_kind: null });
  });
  it("keeps the approval when an approved piece goes out", () => {
    expect(statusFields("published", { kind: "team", name: "" }, now, "approved")).not.toHaveProperty("approved_at");
  });
});

describe("statusAfterSave", () => {
  it("sends approved text back to the client when it changes", () => {
    expect(statusAfterSave("approved", undefined, true)).toBe("in_review");
    expect(statusAfterSave("approved", undefined, false)).toBe(null);
    expect(statusAfterSave("in_review", "approved", true)).toBe("approved");
  });
});
