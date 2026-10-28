import type { CompanyProfile } from "../company/profile";
import type { Signal } from "../domain/signal";
import { matchTermGroups, normalizeText, termName } from "../text/match";

const STOP_WORDS = new Set(["para", "como", "sobre", "entre", "desde", "hasta", "mas", "los", "las", "del", "con", "por", "una", "uno", "que", "sus", "nuestro", "nuestra"]);
const STEM_LENGTH = 5;
const MIN_WORD_LENGTH = 4;

const stemsOf = (text: string): string[] =>
  [...new Set(normalizeText(text).split(" ").filter((word) => word.length >= MIN_WORD_LENGTH && !STOP_WORDS.has(word)).map((word) => word.slice(0, STEM_LENGTH)))];

/** A priority matches when two of its significant words (or its only one) appear in the aviso, compared by stem. */
function matchesPriority(priority: string, haystackStems: ReadonlySet<string>): boolean {
  const stems = stemsOf(priority);
  if (stems.length === 0) return false;
  return stems.filter((stem) => haystackStems.has(stem)).length >= Math.min(stems.length, 2);
}

/**
 * One deterministic sentence on why an aviso matters to the company, from what the aviso matched in its
 * own profile: a competitor, then a priority, then a term it watches. It states the match, never a
 * consequence. `undefined` when nothing matches.
 */
export function whyItMatters(signal: Pick<Signal, "title" | "detail">, profile: CompanyProfile | undefined): string | undefined {
  if (!profile) return undefined;
  const text = `${signal.title}. ${signal.detail}`;

  const competitor = profile.competitors.find((item) => matchTermGroups(text, [{ id: "c", label: "c", terms: [item.name] }]).length > 0);
  if (competitor) return `Menciona a su competidor «${competitor.name}».`;

  const stems = new Set(stemsOf(text));
  const priority = profile.goals.priorities.find((item) => matchesPriority(item, stems));
  if (priority) return `Afecta su prioridad: «${priority}».`;

  const groups = [
    ...Object.entries(profile.newsGroups).map(([id, group]) => ({ id, label: id, terms: group.terms.map(termName) })),
    { id: "regulationKeywords", label: "regulationKeywords", terms: [...profile.regulationKeywords] },
  ];
  const [match] = matchTermGroups(text, groups);
  if (match) return `Coincide con un término que usted vigila: «${match.term}».`;
  return undefined;
}
