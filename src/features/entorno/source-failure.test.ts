import { describe, expect, it } from "vitest";
import type { SourceError } from "@/core/domain/result";
import { SourceFailure, errorKindOf } from "./source-failure";

const kinds: SourceError["kind"][] = ["network", "rate_limited", "unauthorized", "schema", "empty", "disabled", "unknown"];

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

describe("SourceFailure: expired access session", () => {
  it.each([401, 403])("maps a %s from an own-API source to unauthorized", (status) => {
    const failure = new SourceFailure({ sourceId: "news-rss", kind: "network", status, message: "x" });
    expect(failure.kind).toBe("unauthorized");
    expect(errorKindOf(failure)).toBe("unauthorized");
  });

  it("does not remap a 403 from an external source", () => {
    expect(new SourceFailure({ sourceId: "secop", kind: "network", status: 403, message: "x" }).kind).toBe("network");
  });

  it("does not remap other statuses of an own-API source", () => {
    expect(new SourceFailure({ sourceId: "xm", kind: "network", status: 500, message: "x" }).kind).toBe("network");
  });
});
