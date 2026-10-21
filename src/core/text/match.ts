export interface TermGroup {
  id: string;
  label: string;
  terms: readonly string[];
}

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

/**
 * Terms of each group found in `text`, ignoring case and accents and only on whole words
 * (so "papel" does not match "papeleo"). One entry per matching term, in group order.
 */
export function matchTermGroups(text: string, groups: readonly TermGroup[]): TermMatch[] {
  const haystack = ` ${normalizeText(text)} `;
  return groups.flatMap((group) =>
    group.terms.flatMap((term) => {
      const needle = normalizeText(term);
      return needle && haystack.includes(` ${needle} `) ? [{ groupId: group.id, term }] : [];
    }),
  );
}
