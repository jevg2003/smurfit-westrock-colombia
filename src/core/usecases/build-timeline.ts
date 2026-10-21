import type { PublicContract } from "../domain/contract";
import type { Dimension, Severity } from "../domain/dimension";
import type { NewsItem } from "../domain/news";
import type { Provenance } from "../domain/provenance";
import type { RegulationEntry } from "../domain/regulation";
import type { Signal } from "../domain/signal";
import { bogotaDateKey } from "../time/bogota";

export interface TimelineEvent {
  /** Prefixed by origin: `signal:`, `contract:`, `news:` or `regulation:`. */
  id: string;
  /** ISO 8601 instant. */
  at: string;
  dimension: Dimension;
  kind: "signal" | "contract" | "news" | "regulation";
  title: string;
  detail?: string;
  severity?: Severity;
  /** Link to the original record. */
  url?: string;
  provenance: Provenance[];
}

export interface TimelineInput {
  signals: readonly Signal[];
  contracts: readonly PublicContract[];
  news: readonly NewsItem[];
  regulations: readonly RegulationEntry[];
  /** Contracts of these suppliers belong to "competidores"; the rest to "contratación". */
  competitorNits: readonly string[];
}

/** Events from every dimension, newest first (ties ordered by id). */
export function buildTimeline({ signals, contracts, news, regulations, competitorNits }: TimelineInput): TimelineEvent[] {
  const competitors = new Set(competitorNits);

  const events: TimelineEvent[] = [
    ...signals.map((signal): TimelineEvent => ({
      id: `signal:${signal.id}`,
      at: signal.occurredAt,
      dimension: signal.dimension,
      kind: "signal",
      title: signal.title,
      detail: signal.detail,
      severity: signal.severity,
      url: signal.provenance[0]?.url,
      provenance: signal.provenance,
    })),
    ...contracts.map((contract): TimelineEvent => ({
      id: `contract:${contract.id}`,
      at: contract.signedAt,
      dimension: competitors.has(contract.supplierNit) ? "competitors" : "procurement",
      kind: "contract",
      title: `${contract.supplierName} firmó un contrato con ${contract.entity}`,
      detail: `Firmado el ${bogotaDateKey(contract.signedAt)}. Estado: ${contract.status}.`,
      url: contract.processUrl ?? contract.provenance.url,
      provenance: [contract.provenance],
    })),
    ...news.map((item): TimelineEvent => ({
      id: `news:${item.id}`,
      at: item.publishedAt,
      dimension: "market",
      kind: "news",
      title: item.title,
      detail: item.outlet,
      url: item.url,
      provenance: [item.provenance],
    })),
    ...regulations.map((entry): TimelineEvent => ({
      id: `regulation:${entry.id}`,
      at: entry.date,
      dimension: "regulation",
      kind: "regulation",
      title: entry.name,
      detail: entry.topic,
      url: entry.url,
      provenance: [entry.provenance],
    })),
  ];

  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id));
}
