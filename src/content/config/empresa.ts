export interface CompanyProfile {
  nit: string;
  name: string;
}

export const COMPANY: CompanyProfile = { nit: "890300406", name: "Cartón de Colombia" };

export const COMPETITORS: readonly CompanyProfile[] = [
  { nit: "860026759", name: "Cartones América" },
  { nit: "890319047", name: "Carvajal Empaques" },
  { nit: "890925108", name: "Papeles y Cartones" },
];

export const DEFAULT_THRESHOLDS = {
  /** Daily TRM move (percent) from which a day is flagged as atypical. */
  trmDailyMovePct: 1,
  /** Contracts ending within this many days go on watch. */
  contractExpiryWatchDays: 90,
  /** Contracts ending within this many days raise an alert. */
  contractExpiryAlertDays: 30,
  /** A competitor contract counts as new when signed within this many days. */
  competitorContractWindowDays: 30,
  /** Daily TRM move (percent) from which the signal becomes an alert. */
  trmDailyAlertPct: 2,
  /** Week-over-week move (percent) of the spot electricity price (XM) that goes on watch. */
  energySpotWeeklyMovePct: 15,
  /** Week-over-week move (percent) of the spot electricity price from which the signal is an alert. */
  energySpotWeeklyAlertPct: 30,
} as const;

export type Thresholds = { [K in keyof typeof DEFAULT_THRESHOLDS]: number };

export interface NewsTermGroup {
  id: "company" | "sector" | "regulation" | "operations";
  label: string;
  terms: readonly string[];
}

/**
 * Default terms. They are specific phrases on purpose: single generic words ("papel", "empaques")
 * match unrelated headlines. The matcher has no AND, so a place name such as Cauca only appears
 * inside a longer phrase.
 */
export const NEWS_TERM_GROUPS: readonly NewsTermGroup[] = [
  {
    id: "company",
    label: "Empresa y competidores",
    terms: [COMPANY.name, "Smurfit Westrock", "Smurfit Kappa", ...COMPETITORS.map((competitor) => competitor.name)],
  },
  {
    id: "sector",
    label: "Sector",
    terms: [
      "cartón corrugado",
      "empaques de cartón",
      "papel kraft",
      "industria papelera",
      "industria del cartón",
      "celulosa",
      "empaque sostenible",
      "bag-in-box",
      "papel reciclado",
    ],
  },
  {
    id: "regulation",
    label: "Regulación y sostenibilidad",
    terms: [
      "REP envases",
      "responsabilidad extendida del productor",
      "Resolución 1407",
      "Ley 2232",
      "aprovechamiento de residuos",
      "economía circular",
    ],
  },
  {
    id: "operations",
    label: "Riesgos operativos",
    terms: [
      "precio del gas natural",
      "gas natural Colombia",
      "paro camionero",
      "Yumbo",
      "plantaciones forestales Cauca",
      "tasa de cambio",
      "dólar en Colombia",
    ],
  },
];

/**
 * The defaults shipped before the phrases above. A saved group that still equals its legacy default
 * was never edited by the user, so the preferences migration replaces it with the new default.
 */
export const LEGACY_NEWS_TERM_GROUPS: Readonly<Record<NewsTermGroup["id"], readonly string[]>> = {
  company: ["Cartón de Colombia", "Smurfit Westrock", "Cartones América", "Carvajal Empaques", "Papeles y Cartones"],
  sector: ["cartón corrugado", "empaques", "papel", "celulosa", "bag-in-box"],
  regulation: ["REP envases", "Resolución 1407", "Ley 2232", "reciclaje", "aprovechamiento"],
  operations: ["gas natural", "Yumbo", "Cauca", "paro camionero", "TRM", "dólar"],
};

export const DEFAULT_NEWS_TERMS: readonly string[] = NEWS_TERM_GROUPS.flatMap((group) => group.terms);

/**
 * Keywords that make a Minambiente publication or a Presidencia decree relevant (regulation and
 * sustainability). Matched on whole words, ignoring case and accents, so plurals are listed.
 * Used for the bounded filter of the decrees dataset and for the regulation signal rule.
 */
export const REGULATION_KEYWORDS: readonly string[] = [
  "residuo",
  "residuos",
  "envase",
  "envases",
  "empaque",
  "empaques",
  "reciclaje",
  "aprovechamiento",
  "plástico",
  "plásticos",
  "responsabilidad extendida",
  "economía circular",
  "sostenibilidad",
  "emisiones",
  "carbono",
  "arancel",
  "aranceles",
  "gas natural",
  "energía",
  "agua",
];

/** Terms that rule out a publication even if a keyword matches (appointments, temporary duties). */
export const REGULATION_EXCLUDE_KEYWORDS: readonly string[] = ["nombramiento", "nombra", "encargo", "ad hoc", "posesión"];
