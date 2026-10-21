import { describe, expect, it } from "vitest";
import { makeSignal } from "@/stores/test-utils";
import { NoopSignalAnalyzer } from "./noop-signal-analyzer";

describe("NoopSignalAnalyzer", () => {
  it("is disabled and never invents an analysis", async () => {
    const result = await new NoopSignalAnalyzer().analyze({ signal: makeSignal("s1") });
    expect(result).toMatchObject({ ok: false, error: { kind: "disabled" } });
  });
});
