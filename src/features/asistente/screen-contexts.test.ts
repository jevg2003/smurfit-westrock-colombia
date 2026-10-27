import { describe, expect, it } from "vitest";
import { fitsPageContextBudget, pageContextSchema } from "@/infrastructure/ai/page-context";
import { makeSignal } from "@/stores/test-utils";
import { CONTEXT_ROWS, signalsContext, followContext, macroContext } from "./screen-contexts";

describe("screen contexts", () => {
  it("builds a bounded, schema-valid summary of the signals on screen", () => {
    const signals = Array.from({ length: 40 }, (_, i) => makeSignal(`s${i}`));
    const context = signalsContext("/resumen", "Avisos", signals, { filters: { severidad: "alerta", vacío: undefined } });
    expect(pageContextSchema.safeParse(context).success).toBe(true);
    expect(context.rows).toHaveLength(CONTEXT_ROWS);
    expect(context.filters).toEqual({ severidad: "alerta" });
    expect(context.keyNumbers?.[0]).toEqual({ label: "Avisos a la vista", value: "40" });
    expect(fitsPageContextBudget(context)).toBe(true);
  });

  it("summarizes the macro series by their latest value", () => {
    const context = macroContext({
      gdp: [
        { indicatorId: "pib", date: "2023", value: 0.6, unit: "%", provenance: { sourceId: "world-bank", url: "https://x.test", fetchedAt: "2026-10-20T00:00:00Z", license: "CC BY 4.0", attribution: "Banco Mundial" } },
        { indicatorId: "pib", date: "2024", value: 1.7, unit: "%", provenance: { sourceId: "world-bank", url: "https://x.test", fetchedAt: "2026-10-20T00:00:00Z", license: "CC BY 4.0", attribution: "Banco Mundial" } },
      ],
      cpi: [],
      exports: [],
    });
    expect(context.keyNumbers).toEqual([{ label: "PIB real (2024)", value: "1.7 %", provenance: undefined }]);
  });

  it("describes what the user follows", () => {
    expect(followContext(["1", "2"], ["trm"]).keyNumbers).toEqual([
      { label: "Competidores seguidos", value: "2" },
      { label: "Indicadores seguidos", value: "trm" },
    ]);
  });
});
