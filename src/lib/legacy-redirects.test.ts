import { describe, expect, it } from "vitest";
import { LEGACY_REDIRECTS, legacyDestination } from "./legacy-redirects";

describe("legacy redirects", () => {
  it.each([
    ["/home", "/resumen?tab=radar"],
    ["/senales", "/resumen?tab=avisos"],
    ["/alertas", "/resumen?tab=avisos"],
    ["/linea-de-tiempo", "/resumen?tab=linea-de-tiempo"],
    ["/seguimiento", "/configuracion?tab=reglas"],
    ["/macro", "/economia?tab=macro"],
    ["/dias", "/economia?tab=trm"],
    ["/contratacion", "/economia?tab=contratacion"],
    ["/competidores", "/economia?tab=competidores"],
    ["/regulacion", "/noticias?tab=regulacion"],
    ["/pestel", "/analisis?tab=pestel"],
    ["/briefing", "/analisis?tab=briefing"],
    ["/preferencias", "/configuracion?tab=reglas"],
    ["/fuentes", "/configuracion?tab=fuentes"],
    ["/acerca", "/configuracion?tab=acerca"],
  ])("sends %s to %s", (source, destination) => {
    expect(legacyDestination(source)).toBe(destination);
  });

  it("keeps the routes that still exist out of the map", () => {
    for (const path of ["/noticias", "/asistente", "/resumen", "/economia", "/analisis", "/configuracion"]) {
      expect(legacyDestination(path)).toBeUndefined();
    }
  });

  it("is permanent and has one entry per old route", () => {
    expect(LEGACY_REDIRECTS).toHaveLength(15);
    expect(new Set(LEGACY_REDIRECTS.map((redirect) => redirect.source)).size).toBe(15);
    expect(LEGACY_REDIRECTS.every((redirect) => redirect.permanent)).toBe(true);
  });
});

describe("next.config", () => {
  it("serves the legacy map as permanent redirects", async () => {
    const { default: nextConfig } = await import("../../next.config");
    const redirects = await nextConfig.redirects?.();
    expect(redirects).toEqual(LEGACY_REDIRECTS.map((item) => ({ source: item.source, destination: item.destination, permanent: true })));
  });
});
