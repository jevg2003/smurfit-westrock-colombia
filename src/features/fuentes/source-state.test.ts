import { describe, expect, it } from "vitest";
import { ERROR_KIND_LABELS, kindFromHttpStatus } from "./source-state";

describe("kindFromHttpStatus", () => {
  it.each([
    [429, "rate_limited"],
    [401, "unauthorized"],
    [403, "unauthorized"],
    [503, "network"],
    [404, "network"],
    [undefined, "unknown"],
  ] as const)("%s -> %s", (status, kind) => {
    expect(kindFromHttpStatus(status)).toBe(kind);
  });

  it("has a Spanish label for every kind", () => {
    expect(Object.keys(ERROR_KIND_LABELS).sort()).toEqual(["disabled", "empty", "network", "rate_limited", "schema", "unauthorized", "unknown"]);
  });
});
