/** A term that counts only when the title also has one of the context words (whole words). */
export interface ContextTerm {
  term: string;
  requireAny: readonly string[];
}

/** A plain string is a term without context rules. */
export type TermSpec = string | ContextTerm;

export interface TermGroup {
  id: string;
  label: string;
  terms: readonly TermSpec[];
  /** The group never matches a title that has any of these words. */
  excludeAny?: readonly string[];
}

/** The name of a term, whichever way it is written. */
export const termName = (spec: TermSpec): string => (typeof spec === "string" ? spec : spec.term);

export interface TermMatch {
  groupId: string;
  term: string;
}

/** Lowercase, no accents, punctuation turned into single spaces. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export interface MatchOptions {
  /** The context words are taken as present: only the exclusions still apply. */
  contextAssumed?: boolean;
}

const hasPhrase = (haystack: string, phrase: string) => haystack.includes(` ${phrase} `);

/** Normalized, non-empty phrases of a word list. */
const phrasesOf = (words: readonly string[] | undefined) => (words ?? []).map(normalizeText).filter((word) => word.length > 0);

/**
 * Terms of each group found in `text`, ignoring case and accents and only on whole words
 * (so "papel" does not match "papeleo"). One entry per matching term, in group order.
 * A group with `excludeAny` words is skipped when the text has one of them, and a term with
 * `requireAny` words only counts when the text has one of those too.
 */
export function matchTermGroups(text: string, groups: readonly TermGroup[], options: MatchOptions = {}): TermMatch[] {
  const haystack = ` ${normalizeText(text)} `;
  return groups.flatMap((group) => {
    if (phrasesOf(group.excludeAny).some((phrase) => hasPhrase(haystack, phrase))) return [];
    return group.terms.flatMap((spec) => {
      const term = termName(spec);
      const needle = normalizeText(term);
      if (!needle || !hasPhrase(haystack, needle)) return [];
      const context = typeof spec === "string" || options.contextAssumed ? [] : phrasesOf(spec.requireAny);
      if (context.length > 0 && !context.some((phrase) => hasPhrase(haystack, phrase))) return [];
      return [{ groupId: group.id, term }];
    });
  });
}
