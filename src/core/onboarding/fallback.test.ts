import { describe, expect, it } from "vitest";
import { fallbackPatch, fallbackQuestion, splitList } from "./fallback";
import { MAX_QUESTIONS_PER_BLOCK, profilePatchSchema, questionSchema, type Answer } from "./schemas";

const seed = { name: "Acme SAS", city: "Cali" };
const answerTo = (question: { id: string; block: "empresa" | "objetivos"; prompt: string }, patch: Partial<Answer> = {}): Answer => ({
  questionId: question.id,
  block: question.block,
  prompt: question.prompt,
  selected: [],
  text: "",
  skipped: false,
  ...patch,
});

describe("fallbackQuestion", () => {
  it("returns valid questions in a stable order, never repeating an answered one", () => {
    const answers: Answer[] = [];
    const ids: string[] = [];
    for (;;) {
      const next = fallbackQuestion("empresa", answers);
      if (!next) break;
      expect(questionSchema.safeParse(next).success).toBe(true);
      ids.push(next.id);
      answers.push(answerTo(next));
    }
    expect(ids).toHaveLength(MAX_QUESTIONS_PER_BLOCK.empresa);
    expect(new Set(ids).size).toBe(ids.length);
    expect(fallbackQuestion("empresa", [])?.id).toBe(ids[0]);
  });

  it("stops at the block cap even when the model answers counted more", () => {
    const answers = Array.from({ length: MAX_QUESTIONS_PER_BLOCK.objetivos }, (_, index) =>
      answerTo({ id: `ai-${index}`, block: "objetivos", prompt: "¿Algo?" }),
    );
    expect(fallbackQuestion("objetivos", answers)).toBeNull();
  });

  it("counts only the answers of its own block", () => {
    const empresaAnswers = Array.from({ length: 4 }, (_, index) => answerTo({ id: `e${index}`, block: "empresa", prompt: "¿Algo?" }));
    expect(fallbackQuestion("objetivos", empresaAnswers)?.block).toBe("objetivos");
  });
});

describe("splitList", () => {
  it("splits on commas, semicolons and new lines, trimming and dropping empties and duplicates", () => {
    expect(splitList("Alpina,  Colanta;\nAlpina\n\n  Zenú ")).toEqual(["Alpina", "Colanta", "Zenú"]);
  });
});

describe("fallbackPatch", () => {
  it("fills the sector and competitors from the empresa answers without inventing NITs", () => {
    const sector = fallbackQuestion("empresa", [])!;
    const patch = fallbackPatch(seed, "empresa", [
      answerTo(sector, { selected: ["Alimentos y bebidas"] }),
      answerTo({ id: "fb-empresa-competidores", block: "empresa", prompt: "¿Competidores?" }, { text: "Alpina, Colanta" }),
    ]);
    expect(patch.sector).toBe("Alimentos y bebidas");
    expect(patch.competitors).toEqual([{ name: "Alpina" }, { name: "Colanta" }]);
    expect(profilePatchSchema.safeParse(patch).success).toBe(true);
  });

  it("builds the full proposal for objetivos from goals and worries", () => {
    const patch = fallbackPatch(seed, "objetivos", [
      answerTo({ id: "fb-empresa-sector", block: "empresa", prompt: "¿Sector?" }, { selected: ["Energía"] }),
      answerTo({ id: "fb-objetivos-situacion", block: "objetivos", prompt: "¿Dónde está?" }, { text: "Vendemos en el Valle." }),
      answerTo({ id: "fb-objetivos-meta", block: "objetivos", prompt: "¿Qué desea lograr?" }, { text: "Exportar." }),
      answerTo({ id: "fb-objetivos-riesgos", block: "objetivos", prompt: "¿Qué le preocupa?" }, { selected: ["Tipo de cambio"] }),
    ]);
    expect(patch.goals).toMatchObject({ currentSituation: "Vendemos en el Valle.", target: "Exportar." });
    expect(patch.newsGroups?.company.terms).toContain("Acme SAS");
    expect(patch.newsGroups?.sector.terms).toContain("Energía");
    expect(patch.newsGroups?.operations.terms.join(" ")).toMatch(/dólar|cambio/i);
    expect(profilePatchSchema.safeParse(patch).success).toBe(true);
  });

  it("returns an empty patch when everything was skipped", () => {
    const sector = fallbackQuestion("empresa", [])!;
    expect(fallbackPatch(seed, "empresa", [answerTo(sector, { skipped: true })])).toEqual({});
  });
});
