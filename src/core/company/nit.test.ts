import { describe, expect, it } from "vitest";
import { computeNitDv, formatNit, formatNitWithDv, nitDigitsSchema, nitInputSchema, optionalNitInputSchema, parseNit } from "./nit";

describe("computeNitDv", () => {
  it.each([
    ["860034313", 7],
    ["890903938", 8],
    ["860002964", 4],
    ["899999068", 1],
    ["800197268", 4],
    ["890300406", 3],
    ["900123456", 8],
  ])("gives the DIAN check digit of %s", (digits, dv) => {
    expect(computeNitDv(digits)).toBe(dv);
  });

  it("gives 0 and 1 when the remainder is 0 or 1", () => {
    expect(computeNitDv("100007")).toBe(0);
    expect(computeNitDv("100000")).toBe(1);
  });
});

describe("formatNit", () => {
  it("groups the digits with dots", () => {
    expect(formatNit("900123456")).toBe("900.123.456");
    expect(formatNit("12345")).toBe("12.345");
    expect(formatNit("")).toBe("");
  });

  it("appends the check digit", () => {
    expect(formatNitWithDv("900123456")).toBe("900.123.456-8");
  });
});

describe("parseNit", () => {
  it("reads digits written in any format", () => {
    expect(parseNit("900.123.456")).toEqual({ digits: "900123456" });
    expect(parseNit(" 900 123 456 ")).toEqual({ digits: "900123456" });
  });

  it("separates the check digit written after a dash", () => {
    expect(parseNit("900.123.456-8")).toEqual({ digits: "900123456", dv: 8 });
    expect(parseNit("900123456-8")).toEqual({ digits: "900123456", dv: 8 });
  });

  it("ignores letters", () => {
    expect(parseNit("NIT 900abc123")).toEqual({ digits: "900123" });
  });

  it("returns empty digits for no input", () => {
    expect(parseNit("")).toEqual({ digits: "" });
  });
});

describe("nit schemas", () => {
  it("stores digits only, 5 to 10", () => {
    expect(nitDigitsSchema.safeParse("900123456").success).toBe(true);
    expect(nitDigitsSchema.safeParse("1234").success).toBe(false);
    expect(nitDigitsSchema.safeParse("12345678901").success).toBe(false);
    expect(nitDigitsSchema.safeParse("900.123.456").success).toBe(false);
  });

  it("accepts the digits typed in the field", () => {
    expect(nitInputSchema.safeParse("900123456").success).toBe(true);
  });

  it("accepts a pasted check digit that matches", () => {
    expect(nitInputSchema.safeParse("900123456-8").success).toBe(true);
  });

  it("rejects a pasted check digit that does not match", () => {
    const result = nitInputSchema.safeParse("900123456-7");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("8");
  });

  it("rejects too few digits", () => {
    expect(nitInputSchema.safeParse("1234").success).toBe(false);
  });

  it("lets the optional version be empty", () => {
    expect(optionalNitInputSchema.safeParse("").success).toBe(true);
    expect(optionalNitInputSchema.safeParse("900123456-7").success).toBe(false);
  });
});
