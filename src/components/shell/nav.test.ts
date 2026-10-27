import { describe, expect, it } from "vitest";
import { BRAND_HREF, HOME_HREF, NAV, isNavActive, navTitle } from "./nav";

describe("shell navigation", () => {
  it("points the Radar entry at /home", () => {
    expect(NAV.find((item) => item.label === "Radar")?.href).toBe("/home");
  });

  it("marks Radar active on /home and not on the landing /", () => {
    expect(isNavActive("/home", "/home")).toBe(true);
    expect(isNavActive("/", "/home")).toBe(false);
  });

  it("links the brand to /home and the landing link to /", () => {
    expect(BRAND_HREF).toBe("/home");
    expect(HOME_HREF).toBe("/");
  });

  it("derives the page title from the pathname", () => {
    expect(navTitle("/home")).toBe("Radar");
    expect(navTitle("/senales")).toBe("Señales");
    expect(navTitle("/unknown")).toBe("Smart Work Core");
  });
});
