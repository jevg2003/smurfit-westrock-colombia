import { describe, expect, it } from "vitest";
import { readFlags } from "./flags";

describe("readFlags", () => {
  it("defaults every source to on", () => {
    expect(readFlags({})).toMatchObject({ newsRss: true, googleNews: true, minambiente: true, presidencia: true, xm: true });
  });

  it("turns a source off with false, 0, off or no (any case)", () => {
    const flags = readFlags({
      FEATURE_NEWS_RSS: "false",
      FEATURE_GOOGLE_NEWS: "OFF",
      FEATURE_MINAMBIENTE: "0",
      FEATURE_PRESIDENCIA: " No ",
    });
    expect(flags).toMatchObject({ newsRss: false, googleNews: false, minambiente: false, presidencia: false });
  });

  it("turns XM off with FEATURE_XM=false and leaves it on by default", () => {
    expect(readFlags({ FEATURE_XM: "false" }).xm).toBe(false);
    expect(readFlags({}).xm).toBe(true);
  });

  it("keeps a source on for any other value", () => {
    expect(readFlags({ FEATURE_GOOGLE_NEWS: "true" }).googleNews).toBe(true);
    expect(readFlags({ FEATURE_GOOGLE_NEWS: "banana" }).googleNews).toBe(true);
  });
});
