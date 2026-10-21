import { describe, expect, it } from "vitest";
import type { SourceError } from "@/core/domain/result";
import { SourceFailure, errorKindOf } from "./source-failure";

const kinds: SourceError["kind"][] = ["network", "rate_limited", "schema", "empty", "disabled", "unknown"];

describe("SourceFailure", () => {
  it.each(kinds)("keeps the %s kind, status and message of the adapter error", (kind) => {
    const failure = new SourceFailure({ sourceId: "secop", kind, status: 503, message: "Mensaje en español." });
    expect(failure).toBeInstanceOf(Error);
    expect(failure.message).toBe("Mensaje en español.");
    expect(failure.kind).toBe(kind);
    expect(failure.status).toBe(503);
    expect(failure.sourceId).toBe("secop");
    expect(errorKindOf(failure)).toBe(kind);
  });

  it("omits the status when the adapter had none", () => {
    expect(new SourceFailure({ sourceId: "xm", kind: "network", message: "x" }).status).toBeUndefined();
  });
});

describe("errorKindOf", () => {
  it("falls back to unknown for plain errors and non-errors", () => {
    expect(errorKindOf(new Error("limitó las consultas"))).toBe("unknown");
    expect(errorKindOf("boom")).toBe("unknown");
    expect(errorKindOf(undefined)).toBe("unknown");
  });
});
