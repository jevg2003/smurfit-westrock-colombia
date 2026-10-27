import { describe, expect, it } from "vitest";
import { buildPreview } from "./preview";

describe("buildPreview", () => {
  it("shows only skeletons while nothing is known", () => {
    const preview = buildPreview(null, {});
    expect(preview.name).toBeNull();
    expect(preview.sector).toBeNull();
    expect(preview.rows.map((row) => row.id)).toEqual(["activity", "competitors", "news", "regulation", "goals"]);
    for (const row of preview.rows) {
      expect(row.title).toBeNull();
      expect(row.lines).toEqual([null, null]);
      expect(row.tags).toEqual([]);
      expect(row.known).toBe(false);
    }
  });

  it("takes the name and the city from the seed and the sector from the patch", () => {
    const preview = buildPreview({ name: "Acme SAS", city: "Cali" }, { sector: "Lácteos" });
    expect(preview).toMatchObject({ name: "Acme SAS", city: "Cali", sector: "Lácteos" });
  });

  it("maps the activity to its row", () => {
    const row = buildPreview({ name: "Acme" }, { activity: "Produce leche en polvo." }).rows.find((entry) => entry.id === "activity");
    expect(row).toMatchObject({ known: true, title: "Produce leche en polvo." });
  });

  it("maps competitors to the title, the second line and tags, and counts the ones with NIT", () => {
    const patch = { competitors: [{ name: "Alpina", nit: "860025900" }, { name: "Colanta" }, { name: "Alquería", nit: "860000001" }, { name: "Parmalat" }] };
    const row = buildPreview({ name: "Acme" }, patch).rows.find((entry) => entry.id === "competitors");
    expect(row).toMatchObject({ known: true, title: "Alpina", lines: ["Colanta, Alquería, Parmalat", "2 con NIT para consultar contratos"], tags: ["Alpina", "Colanta", "Alquería"] });
  });

  it("maps news terms of the sector, the company and the operation", () => {
    const patch = {
      newsGroups: {
        company: { terms: ["Acme"], contextTerms: [] },
        sector: { terms: ["lácteos", "leche", "queso", "yogur", "crema"], contextTerms: "all" as const },
        regulation: { terms: [], contextTerms: "all" as const },
        operations: { terms: ["paro camionero"], contextTerms: [] },
      },
    };
    const row = buildPreview({ name: "Acme" }, patch).rows.find((entry) => entry.id === "news");
    expect(row).toMatchObject({ known: true, title: "lácteos", lines: ["leche, queso, yogur", "paro camionero"], tags: ["lácteos", "leche", "queso"] });
  });

  it("maps regulation terms and keywords the AI proposed, not the defaults", () => {
    const patch = {
      newsGroups: {
        company: { terms: [], contextTerms: [] },
        sector: { terms: [], contextTerms: "all" as const },
        regulation: { terms: ["resolución 1407"], contextTerms: "all" as const },
        operations: { terms: [], contextTerms: [] },
      },
      regulationKeywords: ["envases", "residuos"],
    };
    const row = buildPreview({ name: "Acme" }, patch).rows.find((entry) => entry.id === "regulation");
    expect(row).toMatchObject({ known: true, title: "resolución 1407", lines: ["envases, residuos", null], tags: ["resolución 1407", "envases", "residuos"] });
    expect(buildPreview({ name: "Acme" }, {}).rows.find((entry) => entry.id === "regulation")?.known).toBe(false);
  });

  it("maps goals: target as title, situation as line and priorities as tags", () => {
    const row = buildPreview({ name: "Acme" }, { goals: { currentSituation: "Vende en 3 ciudades", target: "Exportar", priorities: ["Costos", "Calidad", "Logística", "Talento"] } }).rows.find((entry) => entry.id === "goals");
    expect(row).toMatchObject({ known: true, title: "Exportar", lines: ["Vende en 3 ciudades", null], tags: ["Costos", "Calidad", "Logística"] });
  });

  it("ignores blank values", () => {
    const row = buildPreview({ name: "Acme" }, { activity: "   ", goals: { target: "" } }).rows;
    expect(row.every((entry) => !entry.known)).toBe(true);
  });
});
