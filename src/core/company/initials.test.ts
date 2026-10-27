import { describe, expect, it } from "vitest";
import { companyInitials } from "./initials";

describe("companyInitials", () => {
  it("takes the first letter of the first two words, uppercased", () => {
    expect(companyInitials("Empresa Ejemplo")).toBe("EE");
    expect(companyInitials("acme")).toBe("A");
    expect(companyInitials("  Cartón   de   Colombia ")).toBe("CD");
  });

  it("falls back to a neutral mark for an empty name", () => {
    expect(companyInitials("   ")).toBe("?");
  });
});
