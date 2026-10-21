import { normalizeText, type TermGroup, type TermSpec } from "./match";

/** The plain definition of a group: its terms, and which of them need a context word. */
export interface TermGroupDefinition {
  id: string;
  label: string;
  terms: readonly string[];
  contextTerms?: readonly string[];
}

export interface ContextRules {
  requireAny: readonly string[];
  excludeAny: readonly string[];
}

/**
 * The matcher group for a definition: terms listed in `contextTerms` (compared as normalized phrases) get the
 * `requireAny` words, and the whole group gets the `excludeAny` words. Pure.
 */
export function buildTermGroup(definition: TermGroupDefinition, rules: ContextRules): TermGroup {
  const gated = new Set((definition.contextTerms ?? []).map(normalizeText));
  const requireAny = rules.requireAny.filter((word) => word.trim().length > 0);
  const terms = definition.terms.map((term): TermSpec => (requireAny.length > 0 && gated.has(normalizeText(term)) ? { term, requireAny } : term));
  const excludeAny = rules.excludeAny.filter((word) => word.trim().length > 0);
  return { id: definition.id, label: definition.label, terms, ...(excludeAny.length > 0 ? { excludeAny } : {}) };
}
