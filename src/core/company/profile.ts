import { z } from "zod";
import {
  DEFAULT_COLOMBIA_CONTEXT_WORDS,
  DEFAULT_EXCLUDE_WORDS,
  DEFAULT_REGULATION_EXCLUDE_KEYWORDS,
  DEFAULT_REGULATION_KEYWORDS,
  DEFAULT_THRESHOLDS,
  type Thresholds,
} from "./defaults";

/** The four fixed groups of the news search. Their terms and context rules belong to each company. */
export const NEWS_GROUP_IDS = ["company", "sector", "regulation", "operations"] as const;
export type NewsGroupId = (typeof NEWS_GROUP_IDS)[number];

export const NEWS_GROUP_LABELS: Readonly<Record<NewsGroupId, string>> = {
  company: "Empresa y competidores",
  sector: "Sector",
  regulation: "Regulación y sostenibilidad",
  operations: "Riesgos operativos",
};

/** Terms that count only with a context word in the title; "all" gates the whole group. */
export type ContextTerms = readonly string[] | "all";

export interface NewsTermGroup {
  id: NewsGroupId;
  label: string;
  terms: readonly string[];
  contextTerms: ContextTerms;
}

/** Whether some term of the group needs context words. */
export const hasContextTerms = (group: Pick<NewsTermGroup, "contextTerms">): boolean => group.contextTerms === "all" || group.contextTerms.length > 0;

const text = (max: number) => z.string().trim().min(1).max(max);
const wordList = (maxItems: number) => z.array(text(120)).max(maxItems);
const positive = z.number().positive().finite();

/** NIT as SECOP stores it: digits only, no dots and no verification digit. */
const nitSchema = z.string().trim().regex(/^\d{5,12}$/, "El NIT lleva solo dígitos, sin puntos ni dígito de verificación.");

export const competitorSchema = z.object({ name: text(120), nit: nitSchema.optional() });
export type Competitor = z.infer<typeof competitorSchema>;

export const newsGroupSchema = z.object({
  terms: wordList(40),
  contextTerms: z.union([wordList(40), z.literal("all")]),
});

export const thresholdsSchema = z.object({
  trmDailyMovePct: positive,
  contractExpiryWatchDays: positive,
  contractExpiryAlertDays: positive,
  competitorContractWindowDays: positive,
  trmDailyAlertPct: positive,
  energySpotWeeklyMovePct: positive,
  energySpotWeeklyAlertPct: positive,
}) satisfies z.ZodType<Thresholds>;

export const goalsSchema = z.object({
  /** Where the company stands today, in the user's words. */
  currentSituation: z.string().trim().max(2000),
  /** What it wants to achieve. */
  target: z.string().trim().max(2000),
  /** Priorities in order of importance. */
  priorities: z.array(text(200)).max(10),
});
export type CompanyGoals = z.infer<typeof goalsSchema>;

export const companyProfileSchema = z.object({
  id: text(64),
  name: text(120),
  /** Optional: without it, public contracts and competitor financials cannot be looked up. */
  nit: nitSchema.optional(),
  /** Industry or line of business in a few words (for example "Alimentos y bebidas"). */
  sector: z.string().trim().max(120).optional(),
  /** What the company does, in a sentence or two. */
  activity: z.string().trim().max(1000),
  city: z.string().trim().max(80).optional(),
  regions: wordList(20),
  competitors: z.array(competitorSchema).max(20),
  newsGroups: z.object({
    company: newsGroupSchema,
    sector: newsGroupSchema,
    regulation: newsGroupSchema,
    operations: newsGroupSchema,
  }),
  /** Words that tie a headline to the Colombian operation (see `DEFAULT_COLOMBIA_CONTEXT_WORDS`). */
  colombiaContextWords: wordList(40),
  /** Words of headlines that are never about the business. */
  excludeWords: wordList(40),
  regulationKeywords: wordList(60),
  regulationExcludeKeywords: wordList(40),
  thresholds: thresholdsSchema,
  goals: goalsSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type CompanyProfile = z.infer<typeof companyProfileSchema>;
export type CompanyNewsGroup = CompanyProfile["newsGroups"][NewsGroupId];

export const hasNit = (profile: Pick<CompanyProfile, "nit">): boolean => profile.nit !== undefined && profile.nit !== "";

/** Digits of a NIT written in any format ("900.123.456-7" becomes "900123456"), or undefined when there are none. */
export function nitOf(raw: string): string | undefined {
  const [body] = raw.trim().split("-");
  const digits = body.replace(/\D+/g, "");
  return digits === "" ? undefined : digits;
}

export type CompetitorWithNit = Competitor & { nit: string };

/** The competitors that SECOP and Supersociedades can look up. */
export const withNitCompetitors = (profile: Pick<CompanyProfile, "competitors">): CompetitorWithNit[] =>
  profile.competitors.filter((competitor): competitor is CompetitorWithNit => competitor.nit !== undefined);

/** The company NIT first and then the NIT of each competitor that has one. */
export function watchedNits(profile: Pick<CompanyProfile, "nit" | "competitors">): string[] {
  return [...(profile.nit ? [profile.nit] : []), ...withNitCompetitors(profile).map((competitor) => competitor.nit)];
}

/** Display name of each watched NIT (the company and its competitors). */
export function namesByNit(profile: Pick<CompanyProfile, "name" | "nit" | "competitors">): Map<string, string> {
  const entries = withNitCompetitors(profile).map((competitor): [string, string] => [competitor.nit, competitor.name]);
  return new Map(profile.nit ? [[profile.nit, profile.name], ...entries] : entries);
}

/** The company group lists the company and its competitors; the rest holds what the user or the onboarding adds. */
export function defaultNewsGroups(profile: Pick<CompanyProfile, "name" | "competitors">): CompanyProfile["newsGroups"] {
  return {
    company: { terms: [profile.name, ...profile.competitors.map((competitor) => competitor.name)], contextTerms: [] },
    sector: { terms: [], contextTerms: "all" },
    regulation: { terms: [], contextTerms: "all" },
    operations: { terms: [], contextTerms: "all" },
  };
}

/** The groups as definitions with their label, in the fixed order. */
export function deriveNewsGroupDefinitions(profile: Pick<CompanyProfile, "newsGroups">): NewsTermGroup[] {
  return NEWS_GROUP_IDS.map((id) => ({
    id,
    label: NEWS_GROUP_LABELS[id],
    terms: profile.newsGroups[id].terms,
    contextTerms: profile.newsGroups[id].contextTerms,
  }));
}

/** Terms trimmed, without empty or repeated ones (ignoring case); the first spelling stays. */
export const uniqueTerms = (terms: readonly string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const term of terms) {
    const trimmed = term.trim();
    const key = trimmed.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
};

/** Every term the news search uses, once. */
export const searchTermsOf = (profile: Pick<CompanyProfile, "newsGroups">): string[] =>
  uniqueTerms(NEWS_GROUP_IDS.flatMap((id) => profile.newsGroups[id].terms));

export interface NewCompanyInput {
  name: string;
  nit?: string;
  sector?: string;
  activity?: string;
  city?: string;
  regions?: string[];
  competitors?: Competitor[];
  goals?: Partial<CompanyGoals>;
}

/** A complete, valid profile from the few fields a user gives first. Everything else gets its default. */
export function createCompanyProfile(input: NewCompanyInput, { id, now }: { id: string; now: Date }): CompanyProfile {
  const name = input.name.trim();
  const competitors = (input.competitors ?? []).map((competitor) => ({ ...competitor, name: competitor.name.trim() }));
  const nit = input.nit ? nitOf(input.nit) : undefined;
  const place = [input.city, ...(input.regions ?? [])].filter((word): word is string => Boolean(word?.trim()));
  const stamp = now.toISOString();
  return {
    id,
    name,
    ...(nit ? { nit } : {}),
    ...(input.sector?.trim() ? { sector: input.sector.trim() } : {}),
    activity: input.activity?.trim() ?? "",
    ...(input.city?.trim() ? { city: input.city.trim() } : {}),
    regions: input.regions ?? [],
    competitors,
    newsGroups: defaultNewsGroups({ name, competitors }),
    colombiaContextWords: uniqueTerms([...DEFAULT_COLOMBIA_CONTEXT_WORDS, ...place]),
    excludeWords: [...DEFAULT_EXCLUDE_WORDS],
    regulationKeywords: [...DEFAULT_REGULATION_KEYWORDS],
    regulationExcludeKeywords: [...DEFAULT_REGULATION_EXCLUDE_KEYWORDS],
    thresholds: { ...DEFAULT_THRESHOLDS },
    goals: { currentSituation: "", target: "", priorities: [], ...input.goals },
    createdAt: stamp,
    updatedAt: stamp,
  };
}
