import "@/lib/zod-config";
import { z } from "zod";
import {
  DEFAULT_REGULATION_EXCLUDE_KEYWORDS,
  DEFAULT_REGULATION_KEYWORDS,
} from "@/core/company/defaults";
import { NEWS_GROUP_IDS, createCompanyProfile, uniqueTerms, type CompanyProfile, type NewsGroupId } from "@/core/company/profile";
import {
  COMPETITORS_MAX,
  REGULATION_KEYWORDS_MAX,
  activitySchema,
  citySchema,
  competitorNameSchema,
  goalTextSchema,
  nameSchema,
  prioritiesSchema,
  sectorSchema,
  termList,
} from "@/core/company/fields";
import { nitOf, optionalNitInputSchema } from "@/core/company/nit";
import type { OnboardingSeed, ProfilePatch } from "./schemas";


/** What the user reviews in the last step. Empty strings stand for "not given" so inputs stay controlled. */
export const confirmFormSchema = z.object({
  name: nameSchema,
  nit: optionalNitInputSchema,
  sector: sectorSchema,
  city: citySchema,
  activity: activitySchema,
  competitors: z.array(z.object({ name: competitorNameSchema, nit: optionalNitInputSchema })).max(COMPETITORS_MAX, `Use ${COMPETITORS_MAX} competidores como máximo.`),
  newsGroups: z.object({ company: termList(), sector: termList(), regulation: termList(), operations: termList() }),
  regulationKeywords: termList(REGULATION_KEYWORDS_MAX),
  currentSituation: goalTextSchema,
  target: goalTextSchema,
  priorities: prioritiesSchema,
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
  const competitors = values.competitors.map((competitor) => {
    const nit = nitOf(competitor.nit);
    return { name: competitor.name.trim(), ...(nit ? { nit } : {}) };
  });
  const base = createCompanyProfile(
    {
      name,
      nit: nitOf(values.nit),
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

/** The seed (first form) an existing company would have given. */
export const profileToSeed = (profile: CompanyProfile): OnboardingSeed => ({
  name: profile.name,
  ...(profile.nit ? { nit: profile.nit } : {}),
  ...(profile.city ? { city: profile.city } : {}),
});

/** Everything the onboarding can fill in, read back from a saved profile (so a new round starts from it). */
export const profileToPatch = (profile: CompanyProfile): ProfilePatch => ({
  ...(profile.sector ? { sector: profile.sector } : {}),
  activity: profile.activity,
  ...(profile.city ? { city: profile.city } : {}),
  regions: profile.regions,
  competitors: profile.competitors,
  newsGroups: profile.newsGroups,
  colombiaContextWords: profile.colombiaContextWords,
  excludeWords: profile.excludeWords,
  regulationKeywords: profile.regulationKeywords,
  regulationExcludeKeywords: profile.regulationExcludeKeywords,
  goals: profile.goals,
});

/**
 * The profile after the user reviewed `values`. It is the same company: id, creation date and thresholds stay,
 * and the parts the form does not show come from `patch` (by default the profile itself).
 */
export function updateProfile(
  profile: CompanyProfile,
  values: ConfirmValues,
  { patch = profileToPatch(profile), now }: { patch?: ProfilePatch; now: Date },
): CompanyProfile {
  const rebuilt = buildProfile(values, patch, { id: profile.id, now });
  return { ...rebuilt, createdAt: profile.createdAt, thresholds: profile.thresholds };
}
