import type { CompanyProfile } from "@/core/company/profile";

/** Most keywords the server accepts per request (see `regulationTermsSchema`). */
const MAX_INCLUDE = 60;

/**
 * What the regulation request sends to filter publications: the company's regulation keywords first, then the terms
 * of its sector and regulation news groups, so a publication about its activity is not lost for lack of a keyword.
 */
export function regulationQueryTerms(
  profile: Pick<CompanyProfile, "regulationKeywords" | "regulationExcludeKeywords" | "newsGroups">,
): { include: string[]; exclude: string[] } {
  const seen = new Set<string>();
  const include: string[] = [];
  for (const term of [...profile.regulationKeywords, ...profile.newsGroups.regulation.terms, ...profile.newsGroups.sector.terms]) {
    const key = term.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    include.push(term.trim());
  }
  return { include: include.slice(0, MAX_INCLUDE), exclude: [...profile.regulationExcludeKeywords] };
}
