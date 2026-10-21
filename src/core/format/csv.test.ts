import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("writes a header and escaped rows", () => {
    expect(toCsv(["a", "b"], [["x,y", 'say "hi"'], [1, null]])).toBe('a,b\n"x,y","say ""hi"""\n1,');
  });

  it("quotes values with line breaks", () => {
    expect(toCsv(["a"], [["one\ntwo"]])).toBe('a\n"one\ntwo"');
  });

  it("neutralizes formulas in text only when asked", () => {
    expect(toCsv(["a"], [["=1+1"], ["-5"], [-5]], { neutralizeFormulas: true })).toBe("a\n'=1+1\n'-5\n-5");
    expect(toCsv(["a"], [["=1+1"]])).toBe("a\n=1+1");
  });
});
