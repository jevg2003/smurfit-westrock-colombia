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

/**
 * Words that tie a headline to Colombia. A company name or a sector phrase can also be the name of a foreign
 * firm or topic: without one of these in the title, Google's Colombia edition returns stories from Spain or
 * Argentina. Cities and regions of the company are added to this list in its profile.
 */
export const DEFAULT_COLOMBIA_CONTEXT_WORDS: readonly string[] = [
  "Colombia",
  "colombiana",
  "colombiano",
  "Bogotá",
  "Medellín",
  "Cali",
  "Barranquilla",
  "Latinoamérica",
  "LatAm",
];

/** Words of headlines that are never about the business (sports, horoscopes). Applied to every group. */
export const DEFAULT_EXCLUDE_WORDS: readonly string[] = ["fútbol", "futsal", "baloncesto", "horóscopo", "partido", "goles"];

/**
 * Regulation keywords that matter to almost any company. Matched on whole words, ignoring case and
 * accents, so plurals are listed. A company profile replaces or extends them.
 */
export const DEFAULT_REGULATION_KEYWORDS: readonly string[] = [
  "residuo",
  "residuos",
  "sostenibilidad",
  "emisiones",
  "carbono",
  "arancel",
  "aranceles",
  "economía circular",
  "energía",
  "agua",
];

/** Terms that rule out a publication even if a keyword matches (appointments, temporary duties). */
export const DEFAULT_REGULATION_EXCLUDE_KEYWORDS: readonly string[] = ["nombramiento", "nombra", "encargo", "ad hoc", "posesión"];

/**
 * Colombian outlets, as they appear in the media feeds and in the `<source>` of Google News items.
 * Matched as whole names ignoring case, accents and punctuation. Items from these come first inside
 * the same term group on the Noticias screen.
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
