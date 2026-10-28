import { describe, expect, it } from "vitest";
import { TEST_COMPANY } from "@/core/company/test-fixtures";
import { decisionTemplatesFor } from "./decision-templates";

const ids = (profile: Parameters<typeof decisionTemplatesFor>[0]) => decisionTemplatesFor(profile).map((item) => item.id);

const BARE = {
  ...TEST_COMPANY,
  nit: undefined,
  sector: "Servicios",
  activity: "Presta servicios de consultoría.",
  competitors: [],
  newsGroups: { ...TEST_COMPANY.newsGroups, sector: { terms: [], contextTerms: "all" as const }, operations: { terms: [], contextTerms: "all" as const } },
  goals: { currentSituation: "", target: "", priorities: [] },
};

describe("decisionTemplatesFor", () => {
  it("always offers the two generic templates", () => {
    expect(ids(BARE)).toEqual(expect.arrayContaining(["new-regulation", "competitor-move"]));
  });

  it("offers public contracts only when the company has a NIT", () => {
    expect(ids(BARE)).not.toContain("public-contracts");
    expect(ids(TEST_COMPANY)).toContain("public-contracts");
  });

  it("offers the exchange-rate template only when the company talks about foreign trade or dollars", () => {
    expect(ids(BARE)).not.toContain("fx-cover");
    expect(ids({ ...BARE, activity: "Importa insumos desde Asia." })).toContain("fx-cover");
    expect(ids(TEST_COMPANY)).toContain("fx-cover"); // goal: export
  });

  it("offers the energy template only when energy is a priority, term or the activity is industrial", () => {
    expect(ids(BARE)).not.toContain("energy-cost");
    expect(ids(TEST_COMPANY)).toContain("energy-cost");
  });

  it("builds one template per priority, at most three, quoting the priority", () => {
    const templates = decisionTemplatesFor({ ...BARE, goals: { ...BARE.goals, priorities: ["A", "B", "C", "D"] } }).filter((item) => item.id.startsWith("priority-"));
    expect(templates).toHaveLength(3);
    expect(templates[0]?.title).toContain("«A»");
  });

  it("names the first competitor in the competitor template", () => {
    const template = decisionTemplatesFor(TEST_COMPANY).find((item) => item.id === "competitor-move");
    expect(template?.title).toContain("Competidora Uno");
  });

  it("has unique ids and no leftover single-company wording", () => {
    const all = decisionTemplatesFor(TEST_COMPANY);
    expect(new Set(all.map((item) => item.id)).size).toBe(all.length);
    expect(JSON.stringify(all)).not.toMatch(/Mira |Confirma |Piensa |res-803/);
  });
});
