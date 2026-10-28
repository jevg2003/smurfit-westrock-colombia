import type { CompanyProfile } from "@/core/company/profile";
import type { PreviousProfile } from "./schemas";

/** The context of an existing company for a re-onboarding round: empty fields are left out, NITs never travel. */
export function buildPreviousProfile(profile: CompanyProfile): PreviousProfile {
  const { company, sector, regulation, operations } = profile.newsGroups;
  const hasGoals = Boolean(profile.goals.currentSituation || profile.goals.target || profile.goals.priorities.length > 0);
  const hasTerms = [company, sector, regulation, operations].some((group) => group.terms.length > 0);
  return {
    name: profile.name,
    ...(profile.sector ? { sector: profile.sector } : {}),
    ...(profile.activity ? { activity: profile.activity } : {}),
    ...(profile.competitors.length > 0 ? { competitors: profile.competitors.map((competitor) => competitor.name) } : {}),
    ...(hasTerms ? { newsTerms: { company: [...company.terms], sector: [...sector.terms], regulation: [...regulation.terms], operations: [...operations.terms] } } : {}),
    ...(profile.regulationKeywords.length > 0 ? { regulationKeywords: [...profile.regulationKeywords] } : {}),
    ...(hasGoals ? { goals: { currentSituation: profile.goals.currentSituation, target: profile.goals.target, priorities: [...profile.goals.priorities] } } : {}),
  };
}
