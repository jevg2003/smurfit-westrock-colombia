import "@/lib/zod-config";
import { z } from "zod";
import {
  DEFAULT_REGULATION_EXCLUDE_KEYWORDS,
  DEFAULT_REGULATION_KEYWORDS,
} from "@/core/company/defaults";
import { NEWS_GROUP_IDS, createCompanyProfile, uniqueTerms, type CompanyProfile, type NewsGroupId } from "@/core/company/profile";
import { nitDigitsSchema, type OnboardingSeed, type ProfilePatch } from "./schemas";

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalNit = z.union([z.literal(""), nitDigitsSchema]);
const termList = (maxItems: number) => z.array(z.string().trim().max(120)).max(maxItems);

/** What the user reviews in the last step. Empty strings stand for "not given" so inputs stay controlled. */
export const confirmFormSchema = z.object({
  name: text(120),
  nit: optionalNit,
  sector: z.string().trim().max(120),
  city: z.string().trim().max(80),
  activity: z.string().trim().max(1000),
  competitors: z.array(z.object({ name: text(120), nit: optionalNit })).max(20),
  newsGroups: z.object({ company: termList(40), sector: termList(40), regulation: termList(40), operations: termList(40) }),
  regulationKeywords: termList(60),
  currentSituation: z.string().trim().max(2000),
  target: z.string().trim().max(2000),
  priorities: z.array(z.string().trim().max(200)).max(10),
});
export type ConfirmValues = z.infer<typeof confirmFormSchema>;

/** The initial values of the confirm form: the seed, then what the AI proposed, then the defaults. */
export function buildConfirmValues(seed: OnboardingSeed, patch: ProfilePatch): ConfirmValues {
  const competitors = (patch.competitors ?? []).map((competitor) => ({ name: competitor.name, nit: competitor.nit ?? "" }));
  const group = (id: NewsGroupId): string[] => [...(patch.newsGroups?.[id].terms ?? [])];
  return {
    name: seed.name,
    nit: seed.nit ?? "",
    sector: patch.sector ?? "",
    city: seed.city ?? patch.city ?? "",
    activity: patch.activity ?? "",
    competitors,
    newsGroups: {
      company: uniqueTerms([seed.name, ...competitors.map((competitor) => competitor.name), ...group("company")]),
      sector: group("sector"),
      regulation: group("regulation"),
      operations: group("operations"),
    },
    regulationKeywords: [...(patch.regulationKeywords ?? DEFAULT_REGULATION_KEYWORDS)],
    currentSituation: patch.goals?.currentSituation ?? "",
    target: patch.goals?.target ?? "",
    priorities: [...(patch.goals?.priorities ?? [])],
  };
}

/** The profile to save: the reviewed values plus the parts of the proposal the form does not show. */
export function buildProfile(values: ConfirmValues, patch: ProfilePatch, { id, now }: { id: string; now: Date }): CompanyProfile {
  const name = values.name.trim();
  const competitors = values.competitors.map((competitor) => ({ name: competitor.name.trim(), ...(competitor.nit ? { nit: competitor.nit } : {}) }));
  const base = createCompanyProfile(
    {
      name,
      nit: values.nit || undefined,
      sector: values.sector,
      activity: values.activity,
      city: values.city,
      regions: patch.regions,
      competitors,
      goals: { currentSituation: values.currentSituation, target: values.target, priorities: uniqueTerms(values.priorities) },
    },
    { id, now },
  );

  const newsGroups = Object.fromEntries(
    NEWS_GROUP_IDS.map((groupId) => {
      const terms = uniqueTerms(groupId === "company" ? [name, ...values.newsGroups.company] : values.newsGroups[groupId]);
      return [groupId, { terms, contextTerms: patch.newsGroups?.[groupId].contextTerms ?? base.newsGroups[groupId].contextTerms }];
    }),
  ) as CompanyProfile["newsGroups"];

  return {
    ...base,
    newsGroups,
    colombiaContextWords: uniqueTerms([...base.colombiaContextWords, ...(patch.colombiaContextWords ?? [])]),
    excludeWords: patch.excludeWords ? uniqueTerms(patch.excludeWords) : base.excludeWords,
    regulationKeywords: uniqueTerms(values.regulationKeywords),
    regulationExcludeKeywords: uniqueTerms(patch.regulationExcludeKeywords ?? DEFAULT_REGULATION_EXCLUDE_KEYWORDS),
  };
}
