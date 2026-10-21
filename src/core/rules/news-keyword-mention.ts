import type { Dimension } from "../domain/dimension";
import type { NewsItem } from "../domain/news";
import type { Signal } from "../domain/signal";
import type { Clock } from "../ports/clock";
import { matchTermGroups, type TermGroup } from "../text/match";
import { bogotaDateKey } from "../time/bogota";
import { makeSignalId } from "./dedupe";
import { pestelForNewsTerm, type NewsTermGroupKey } from "./pestel-mapping";

export const NEWS_KEYWORD_MENTION_RULE_ID = "news.keyword-mention.v1";

/** A headline counts as new when it was published at most this many days ago. */
export const NEWS_WINDOW_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Only these term groups raise signals (proposal §4.6): a mention of the company or a competitor
 * (market) and regulation or sustainability terms (regulation). Sector and operational-risk terms
 * are still highlighted on the Noticias screen but would flood the radar, so they raise nothing.
 */
const SIGNAL_GROUPS: Partial<Record<string, { dimension: Dimension; key: NewsTermGroupKey }>> = {
  company: { dimension: "market", key: "company" },
  regulation: { dimension: "regulation", key: "regulation" },
};

export interface NewsKeywordMentionInput {
  news: readonly NewsItem[];
  /** The groups of the preferences, with their current terms. */
  groups: readonly TermGroup[];
  clock: Clock;
}

/**
 * A headline published in the last 7 days (exactly 7 days ago counts; future dates do not) mentions
 * a term of the company or competitors group or of the regulation group. Severity is always `info`.
 * One signal per item and group, so the rule text can name the group and the first term matched.
 */
export function detectNewsKeywordMentions({ news, groups, clock }: NewsKeywordMentionInput): Signal[] {
  const now = clock.now().getTime();
  const signalGroups = groups.filter((group) => SIGNAL_GROUPS[group.id]);

  return news.flatMap((item): Signal[] => {
    const age = now - Date.parse(item.publishedAt);
    if (!(age >= 0 && age <= NEWS_WINDOW_DAYS * DAY_MS)) return [];

    return signalGroups.flatMap((group): Signal[] => {
      const [match] = matchTermGroups(item.title, [group]);
      const config = SIGNAL_GROUPS[group.id];
      if (!match || !config) return [];
      return [
        {
          id: makeSignalId(NEWS_KEYWORD_MENTION_RULE_ID, `${item.id}.${group.id}`, bogotaDateKey(item.publishedAt)),
          ruleId: NEWS_KEYWORD_MENTION_RULE_ID,
          ruleText: `Un titular de los últimos ${NEWS_WINDOW_DAYS} días menciona "${match.term}" (grupo: ${group.label})`,
          dimension: config.dimension,
          pestel: pestelForNewsTerm(config.key, match.term),
          severity: "info",
          kind: "event",
          title: item.title,
          detail: `${item.outlet}, ${bogotaDateKey(item.publishedAt)}${item.via === "google-news" ? " (vía Google News)" : ""}. Término: ${match.term}.`,
          occurredAt: item.publishedAt,
          evidence: [{ kind: "news", ref: item.id }],
          provenance: [item.provenance],
        },
      ];
    });
  });
}
