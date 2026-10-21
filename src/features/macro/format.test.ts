import { describe, expect, it } from "vitest";
import { formatMillionsUsd, formatPct, formatPct1, formatQuarter, lastTwo } from "./format";

describe("formatPct", () => {
  it("writes the percent with a Spanish decimal comma and at most two decimals", () => {
    expect(formatPct(2.64201548985928)).toBe("2,64 %");
    expect(formatPct(-0.5)).toBe("-0,5 %");
    expect(formatPct(0)).toBe("0 %");
  });
});

describe("formatPct1", () => {
  it("rounds to one decimal", () => {
    expect(formatPct1(9.4241)).toBe("9,4 %");
  });
});

describe("formatQuarter", () => {
  it("names the quarter from its end date", () => {
    expect(formatQuarter("2026-06-30")).toBe("T2 2026");
    expect(formatQuarter("2025-12-31")).toBe("T4 2025");
    expect(formatQuarter("2016-03-31")).toBe("T1 2016");
  });

  it("returns the input when it is not a date", () => {
    expect(formatQuarter("x")).toBe("x");
  });
});

describe("formatMillionsUsd", () => {
  it("groups thousands", () => {
    expect(formatMillionsUsd(6234)).toMatch(/^6\.234$|^6234$/);
  });
});

describe("lastTwo", () => {
  it("returns the latest and the previous item", () => {
    expect(lastTwo([1, 2, 3])).toEqual({ latest: 3, previous: 2 });
    expect(lastTwo([1])).toEqual({ latest: 1, previous: undefined });
    expect(lastTwo([])).toEqual({ latest: undefined, previous: undefined });
  });
});
