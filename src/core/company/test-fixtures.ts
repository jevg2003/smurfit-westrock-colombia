import { buildCompanyContext } from "./context";
import type { CompanyProfile } from "./profile";

/** A fictional company for tests: it has a NIT, three competitors with NIT and no relation to a real firm. */
export const TEST_COMPANY: CompanyProfile = {
  id: "empresa-ejemplo",
  name: "Empresa Ejemplo",
  nit: "900000001",
  activity: "Fabrica y vende piezas metálicas para la industria.",
  city: "Medellín",
  regions: ["Antioquia"],
  competitors: [
    { name: "Competidora Uno", nit: "900000002" },
    { name: "Competidora Dos", nit: "900000003" },
    { name: "Competidora Tres", nit: "900000004" },
  ],
  newsGroups: {
    // The company name also belongs to a foreign firm, so it counts only with a Colombian context word.
    company: { terms: ["Empresa Ejemplo", "Competidora Uno", "Competidora Dos", "Competidora Tres"], contextTerms: ["Empresa Ejemplo"] },
    sector: { terms: ["piezas metálicas", "industria metalmecánica"], contextTerms: "all" },
    regulation: { terms: ["arancel acero", "economía circular"], contextTerms: "all" },
    operations: { terms: ["precio del gas natural", "paro camionero", "tasa de cambio", "Itagüí"], contextTerms: "all" },
  },
  colombiaContextWords: ["Colombia", "colombiana", "Medellín", "Antioquia", "Itagüí"],
  excludeWords: ["fútbol", "horóscopo", "goles"],
  regulationKeywords: ["residuo", "residuos", "sostenibilidad", "arancel", "aranceles", "energía"],
  regulationExcludeKeywords: ["nombramiento", "nombra", "posesión"],
  thresholds: {
    trmDailyMovePct: 1,
    contractExpiryWatchDays: 90,
    contractExpiryAlertDays: 30,
    competitorContractWindowDays: 30,
    trmDailyAlertPct: 2,
    energySpotWeeklyMovePct: 15,
    energySpotWeeklyAlertPct: 30,
  },
  goals: {
    currentSituation: "Vende sobre todo en el mercado local.",
    target: "Exportar a dos países en tres años.",
    priorities: ["Reducir costos de energía", "Abrir clientes en el exterior"],
  },
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

/** What the browser sends to the server for the fixture company. */
export const TEST_COMPANY_CONTEXT = buildCompanyContext(TEST_COMPANY);
