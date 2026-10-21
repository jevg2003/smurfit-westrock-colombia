import type { RegulationItem } from "../domain/regulation";
import type { Signal } from "../domain/signal";
import type { Clock } from "../ports/clock";
import { matchTermGroups } from "../text/match";
import { bogotaDateKey } from "../time/bogota";
import { makeSignalId } from "./dedupe";
import { pestelForRegulation } from "./pestel-mapping";

export const REGULATION_KEYWORD_MENTION_RULE_ID = "regulation.keyword-mention.v1";

/** A publication counts as new when it is at most this many days old. */
export const REGULATION_WINDOW_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RegulationTopicTerms {
  /** Regulation and sustainability keywords: a match makes the item relevant. */
  include: readonly string[];
  /** Terms that rule an item out (for example appointments), even if a keyword matches. */
  exclude: readonly string[];
}

const textOf = (item: Pick<RegulationItem, "title" | "summary">) => (item.summary ? `${item.title} ${item.summary}` : item.title);

/** The first keyword the item mentions, or undefined when it has none or an excluded term. */
export function regulationKeywordOf(item: Pick<RegulationItem, "title" | "summary">, { include, exclude }: RegulationTopicTerms): string | undefined {
  const text = textOf(item);
  const group = (terms: readonly string[]) => [{ id: "terms", label: "terms", terms }];
  if (matchTermGroups(text, group(exclude)).length > 0) return undefined;
  return matchTermGroups(text, group(include))[0]?.term;
}

export interface RegulationMentionInput extends RegulationTopicTerms {
  items: readonly RegulationItem[];
  clock: Clock;
}

const KIND_LABELS: Record<RegulationItem["kind"], string> = { minambiente: "Minambiente", decree: "Decreto de Presidencia" };

/**
 * A Minambiente publication or a Presidencia decree from the last 30 days (exactly 30 days ago
 * counts; future dates do not) mentions a regulation or sustainability keyword. Severity is `info`.
 */
export function detectRegulationMentions({ items, include, exclude, clock }: RegulationMentionInput): Signal[] {
  const now = clock.now().getTime();
  return items.flatMap((item): Signal[] => {
    const age = now - Date.parse(item.publishedAt);
    if (!(age >= 0 && age <= REGULATION_WINDOW_DAYS * DAY_MS)) return [];
    const keyword = regulationKeywordOf(item, { include, exclude });
    if (!keyword) return [];
    return [
      {
        id: makeSignalId(REGULATION_KEYWORD_MENTION_RULE_ID, item.id, bogotaDateKey(item.publishedAt)),
        ruleId: REGULATION_KEYWORD_MENTION_RULE_ID,
        ruleText: `Una publicación de Minambiente o un decreto de Presidencia de los últimos ${REGULATION_WINDOW_DAYS} días menciona "${keyword}" (palabras clave de regulación y sostenibilidad)`,
        dimension: "regulation",
        pestel: pestelForRegulation(),
        severity: "info",
        kind: "event",
        title: item.title,
        detail: `${KIND_LABELS[item.kind]}, ${bogotaDateKey(item.publishedAt)}. Palabra clave: ${keyword}.`,
        occurredAt: item.publishedAt,
        evidence: [{ kind: "regulation", ref: item.id }],
        provenance: [item.provenance],
      },
    ];
  });
}
