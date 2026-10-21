import { describe, expect, it } from "vitest";
import type { SourceView } from "@/features/entorno/source-view";
import { SourceFailure } from "@/features/entorno/source-failure";
import { fromBlock, fromFeed, fromView, withFlag } from "./snapshots";

const retry = () => {};
const view = (overrides: Partial<SourceView>): SourceView => ({ status: "ready", isStale: false, updatedAt: 1000, retry, ...overrides });

describe("fromView", () => {
  it("is pending until the first answer", () => {
    expect(fromView(view({ status: "pending", updatedAt: undefined }), {}).state).toBe("pending");
  });

  it("is ok with data, keeping the last success time", () => {
    expect(fromView(view({}), {})).toMatchObject({ state: "ok", lastSuccess: 1000 });
  });

  it("is empty when the answer carries no records", () => {
    expect(fromView(view({}), { empty: true }).state).toBe("empty");
  });

  it("is disabled when the server switched the source off", () => {
    expect(fromView(view({}), { off: true }).state).toBe("disabled");
  });

  it("is an error with a classified kind when there is no data", () => {
    const error = new SourceFailure({ sourceId: "secop", kind: "rate_limited", status: 429, message: "SECOP II limitó las consultas." });
    const snapshot = fromView(view({ status: "error", errorMessage: error.message, updatedAt: undefined }), { error });
    expect(snapshot).toMatchObject({ state: "error", error: { kind: "rate_limited", message: "SECOP II limitó las consultas." } });
  });

  it.each(["network", "schema", "empty", "disabled"] as const)("reads the %s kind straight from the SourceFailure", (kind) => {
    const error = new SourceFailure({ sourceId: "secop", kind, message: "texto sin pistas" });
    expect(fromView(view({ status: "error", errorMessage: error.message, updatedAt: undefined }), { error }).error?.kind).toBe(kind);
  });

  it("reports unknown for an error that is not a SourceFailure, whatever its text says", () => {
    const error = new Error("SECOP II limitó las consultas.");
    expect(fromView(view({ status: "error", errorMessage: error.message, updatedAt: undefined }), { error }).error?.kind).toBe("unknown");
    expect(fromView(view({ status: "error", errorMessage: "x", updatedAt: undefined }), {}).error?.kind).toBe("unknown");
  });

  it("is stale when a refresh failed but older data remains", () => {
    const error = new SourceFailure({ sourceId: "secop", kind: "network", message: "no respondió a tiempo" });
    const snapshot = fromView(view({ isStale: true, errorMessage: error.message }), { error });
    expect(snapshot).toMatchObject({ state: "stale", lastSuccess: 1000, error: { kind: "network" } });
  });

  it("exposes retry", () => {
    expect(fromView(view({}), {}).retry).toBe(retry);
  });
});

describe("fromFeed and fromBlock", () => {
  it("maps feed health", () => {
    expect(fromFeed({ id: "a", outlet: "A", status: "ok", count: 3 }, 5, retry)).toMatchObject({ state: "ok", lastSuccess: 5 });
    expect(fromFeed({ id: "a", outlet: "A", status: "ok", count: 0 }, 5, retry).state).toBe("empty");
    expect(fromFeed({ id: "a", outlet: "A", status: "disabled", count: 0, message: "Fuente desactivada." }, 5, retry).state).toBe("disabled");
    expect(fromFeed({ id: "a", outlet: "A", status: "error", count: 0, httpStatus: 503, message: "respondió con el estado 503" }, 5, retry)).toMatchObject({
      state: "error",
      error: { kind: "network" },
    });
  });

  it("maps a regulation block", () => {
    expect(fromBlock({ status: "ok", items: [] }, 7, retry).state).toBe("empty");
    expect(fromBlock({ status: "disabled", items: [] }, 7, retry).state).toBe("disabled");
    expect(fromBlock({ status: "error", items: [], message: "boom" }, 7, retry).state).toBe("error");
  });
});

describe("withFlag", () => {
  it("overrides any state with disabled when the flag is off", () => {
    expect(withFlag({ state: "ok", lastSuccess: 1 }, false).state).toBe("disabled");
  });

  it("keeps the state when the flag is on or unknown", () => {
    expect(withFlag({ state: "ok" }, true).state).toBe("ok");
    expect(withFlag({ state: "ok" }, undefined).state).toBe("ok");
  });
});
