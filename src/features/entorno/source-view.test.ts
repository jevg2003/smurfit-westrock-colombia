import { describe, expect, it } from "vitest";
import { SourceFailure } from "./source-failure";
import { toSourceView } from "./source-view";

const query = (error: unknown) => ({ isError: true, error, data: undefined, dataUpdatedAt: 0, refetch: () => undefined });

describe("toSourceView errorKind", () => {
  it("exposes the real kind of a SourceFailure", () => {
    const view = toSourceView(query(new SourceFailure({ sourceId: "secop", kind: "rate_limited", message: "x" })));
    expect(view.errorKind).toBe("rate_limited");
  });

  it("falls back to unknown for plain errors", () => {
    expect(toSourceView(query(new Error("x"))).errorKind).toBe("unknown");
  });

  it("has no errorKind when there is no error", () => {
    const view = toSourceView({ isError: false, error: null, data: 1, dataUpdatedAt: 5, refetch: () => undefined });
    expect(view.errorKind).toBeUndefined();
  });
});
