import { regulationKeywordOf, type RegulationTopicTerms } from "@/core/rules/regulation-keyword-mention";

/**
 * Whether a publication matters to the company: it mentions one of its keywords (case and accents ignored) and none
 * of the excluded terms. A company with no keywords yet filters nothing, except for the excluded terms.
 */
export function isRelevantToTerms(item: { title: string; summary?: string }, terms: RegulationTopicTerms): boolean {
  if (terms.include.length > 0) return regulationKeywordOf(item, terms) !== undefined;
  const excluded = regulationKeywordOf(item, { include: terms.exclude, exclude: [] });
  return excluded === undefined;
}
