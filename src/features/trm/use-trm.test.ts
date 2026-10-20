import { describe, expect, it } from "vitest";
import { DEFAULT_THRESHOLDS } from "@/content/config/empresa";
import { DEFAULT_TRM_DAILY_MOVE_PCT } from "@/core/rules/trm-daily-move";
import { UMBRAL_ATIPICO_PCT, procesar } from "./use-trm";
import type { TrmRegistro } from "./types";

function registro(fecha: string, valor: string): TrmRegistro {
  return { valor, unidad: "COP", vigenciadesde: fecha, vigenciahasta: fecha };
}

describe("procesar (characterization)", () => {
  it("uses a 1% threshold", () => {
    expect(UMBRAL_ATIPICO_PCT).toBe(1);
  });

  it("takes its default threshold from the company config", () => {
    expect(UMBRAL_ATIPICO_PCT).toBe(DEFAULT_THRESHOLDS.trmDailyMovePct);
    expect(DEFAULT_TRM_DAILY_MOVE_PCT).toBe(DEFAULT_THRESHOLDS.trmDailyMovePct);
  });

  it("returns an empty list for no records", () => {
    expect(procesar([])).toEqual([]);
  });

  it("leaves the first day without variation and not atypical", () => {
    const [primero] = procesar([registro("2026-10-01T00:00:00.000", "4000")]);
    expect(primero).toEqual({ fecha: "2026-10-01T00:00:00.000", valor: 4000, variacionPct: null, atipico: false });
  });

  it("sorts ascending by date and computes variation against the previous day", () => {
    const puntos = procesar([
      registro("2026-10-03T00:00:00.000", "4040"),
      registro("2026-10-01T00:00:00.000", "4000"),
      registro("2026-10-02T00:00:00.000", "4020"),
    ]);
    expect(puntos.map((punto) => punto.fecha)).toEqual([
      "2026-10-01T00:00:00.000",
      "2026-10-02T00:00:00.000",
      "2026-10-03T00:00:00.000",
    ]);
    expect(puntos[1].variacionPct).toBeCloseTo(0.5, 10);
    expect(puntos[2].variacionPct).toBeCloseTo((20 / 4020) * 100, 10);
  });

  it("does not mutate the input", () => {
    const entrada = [registro("2026-10-02", "4020"), registro("2026-10-01", "4000")];
    procesar(entrada);
    expect(entrada.map((item) => item.vigenciadesde)).toEqual(["2026-10-02", "2026-10-01"]);
  });

  it("marks a day atypical at exactly the threshold", () => {
    const puntos = procesar([registro("2026-10-01", "100"), registro("2026-10-02", "101")]);
    expect(puntos[1].variacionPct).toBeCloseTo(1, 10);
    expect(puntos[1].atipico).toBe(true);
  });

  it("does not mark a day atypical just below the threshold", () => {
    const puntos = procesar([registro("2026-10-01", "100"), registro("2026-10-02", "100.99")]);
    expect(puntos[1].atipico).toBe(false);
  });

  it("marks drops as atypical using the absolute variation", () => {
    const puntos = procesar([registro("2026-10-01", "4000"), registro("2026-10-02", "3900")]);
    expect(puntos[1].variacionPct).toBeCloseTo(-2.5, 10);
    expect(puntos[1].atipico).toBe(true);
  });

  it("gives no variation when the previous value is zero", () => {
    const puntos = procesar([registro("2026-10-01", "0"), registro("2026-10-02", "100")]);
    expect(puntos[1].variacionPct).toBeNull();
    expect(puntos[1].atipico).toBe(false);
  });
});
