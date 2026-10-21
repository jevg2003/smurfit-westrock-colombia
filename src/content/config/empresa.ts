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
  /** Terms of this group that count only with a context word in the title (see `DEFAULT_NEWS_CONTEXT`). */
  contextTerms: readonly string[];
}

/** The context rules a user can edit for each group. */
export interface NewsContextRules {
  /** A context term counts only if the title also has one of these words. */
  requireAny: string[];
  /** The group ignores a title that has any of these words. */
  excludeAny: string[];
}

/**
 * Words that tie a global company name to the Colombian operation. "Smurfit Westrock" is a worldwide
 * name: without one of these in the title, Google's Colombia edition also returns Spanish football
 * sponsorships and plant news from Spain or Argentina.
 */
export const COLOMBIA_CONTEXT_WORDS: readonly string[] = [
  "Colombia",
  "colombiana",
  "colombiano",
  "Yumbo",
  "Cali",
  "Valle del Cauca",
  "Cauca",
  "Cartón de Colombia",
  "Bogotá",
  "Barranquilla",
  "Medellín",
  "Latinoamérica",
  "LatAm",
  "Américas",
];

/** Words of headlines that are never about the business (sports, horoscopes). Applied to every group. */
export const DEFAULT_EXCLUDE_WORDS: readonly string[] = [
  "fútbol",
  "futsal",
  "Tercera División",
  "Liga",
  "CD",
  "Villalba",
  "baloncesto",
  "horóscopo",
  "partido",
  "goles",
];

const NO_CONTEXT_TERMS: readonly string[] = [];

/**
 * Default terms. They are specific phrases on purpose: single generic words ("papel", "empaques")
 * match unrelated headlines. A place name such as Cauca only appears inside a longer phrase, and the
 * global company names carry context words (`contextTerms`).
 */
export const NEWS_TERM_GROUPS: readonly NewsTermGroup[] = [
  {
    id: "company",
    label: "Empresa y competidores",
    terms: [COMPANY.name, "Smurfit Westrock", "Smurfit Kappa", ...COMPETITORS.map((competitor) => competitor.name)],
    contextTerms: ["Smurfit Westrock", "Smurfit Kappa"],
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
    contextTerms: NO_CONTEXT_TERMS,
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
    contextTerms: NO_CONTEXT_TERMS,
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
    contextTerms: NO_CONTEXT_TERMS,
  },
];

/** Default context rules of each group: Colombian context for the company group, the same exclusions for all. */
export const DEFAULT_NEWS_CONTEXT: Readonly<Record<NewsTermGroup["id"], NewsContextRules>> = Object.fromEntries(
  NEWS_TERM_GROUPS.map((group) => [
    group.id,
    { requireAny: group.contextTerms.length > 0 ? [...COLOMBIA_CONTEXT_WORDS] : [], excludeAny: [...DEFAULT_EXCLUDE_WORDS] },
  ]),
) as Record<NewsTermGroup["id"], NewsContextRules>;

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

/**
 * Colombian outlets, as they appear in the media feeds and in the `<source>` of Google News items (checked
 * against the RSS fixtures). Matched as whole names ignoring case, accents and punctuation. Items from these
 * come first inside the same term group on the Noticias screen.
 */
export const COLOMBIAN_OUTLETS: readonly string[] = [
  "Portafolio",
  "Portafolio.co",
  "La República",
  "El Tiempo",
  "Valora Analitik",
  "El Colombiano",
  "Revista Semana",
  "Semana",
  "Caracol Radio",
];

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
