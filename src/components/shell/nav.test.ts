import { describe, expect, it } from "vitest";
import { BRAND_HREF, CONFIG_ITEM, HOME_HREF, NAV, isNavActive, navTitle } from "./nav";

describe("shell navigation", () => {
  it("has five items in order", () => {
    expect(NAV.map((item) => [item.label, item.href])).toEqual([
      ["Resumen", "/resumen"],
      ["Economía", "/economia"],
      ["Noticias", "/noticias"],
      ["Análisis", "/analisis"],
      ["Asistente", "/asistente"],
    ]);
  });

  it("puts Configuración apart, in the footer", () => {
    expect(CONFIG_ITEM).toMatchObject({ label: "Configuración", href: "/configuracion" });
    expect(NAV.some((item) => item.href === CONFIG_ITEM.href)).toBe(false);
  });

  it("marks an item active on its path and not on the landing /", () => {
    expect(isNavActive("/resumen", "/resumen")).toBe(true);
    expect(isNavActive("/", "/resumen")).toBe(false);
  });

  it("links the brand to /resumen and the landing link to /", () => {
    expect(BRAND_HREF).toBe("/resumen");
    expect(HOME_HREF).toBe("/");
  });

  it("derives the page title from the pathname", () => {
    expect(navTitle("/resumen")).toBe("Resumen");
    expect(navTitle("/configuracion")).toBe("Configuración");
    expect(navTitle("/unknown")).toBe("Smart Work Core");
  });
});
