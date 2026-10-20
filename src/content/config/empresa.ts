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
} as const;

export type Thresholds = { [K in keyof typeof DEFAULT_THRESHOLDS]: number };

export interface NewsTermGroup {
  id: "company" | "sector" | "regulation" | "operations";
  label: string;
  terms: readonly string[];
}

export const NEWS_TERM_GROUPS: readonly NewsTermGroup[] = [
  {
    id: "company",
    label: "Empresa y competidores",
    terms: [COMPANY.name, "Smurfit Westrock", ...COMPETITORS.map((competitor) => competitor.name)],
  },
  {
    id: "sector",
    label: "Sector",
    terms: ["cartón corrugado", "empaques", "papel", "celulosa", "bag-in-box"],
  },
  {
    id: "regulation",
    label: "Regulación y sostenibilidad",
    terms: ["REP envases", "Resolución 1407", "Ley 2232", "reciclaje", "aprovechamiento"],
  },
  {
    id: "operations",
    label: "Riesgos operativos",
    terms: ["gas natural", "Yumbo", "Cauca", "paro camionero", "TRM", "dólar"],
  },
];

export const DEFAULT_NEWS_TERMS: readonly string[] = NEWS_TERM_GROUPS.flatMap((group) => group.terms);
