import type { Briefing } from "@/core/domain/briefing";
import type { PublicContract } from "@/core/domain/contract";
import type { Observation } from "@/core/domain/observation";
import type { Provenance } from "@/core/domain/provenance";
import type { Signal } from "@/core/domain/signal";
import type { TimelineEvent } from "@/core/usecases/build-timeline";
import type { PageContext } from "@/infrastructure/ai/page-context";

/** Rows each screen shares with the assistant. Few, because the prompt budget is small. */
export const CONTEXT_ROWS = 8;

type ContextProvenance = NonNullable<NonNullable<PageContext["rows"]>[number]["provenance"]>;

export function contextProvenance(provenance: Provenance | undefined): ContextProvenance | undefined {
  if (!provenance) return undefined;
  return { source: provenance.attribution, url: provenance.url, fetchedAt: provenance.fetchedAt, license: provenance.license };
}

const day = (iso: string) => iso.slice(0, 10);
const present = (filters: Record<string, string | undefined>) =>
  Object.fromEntries(Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])));

/** Radar, Señales and Alertas: the signals on screen, most important first. */
export function signalsContext(
  route: string,
  title: string,
  signals: readonly Signal[],
  extra: { filters?: Record<string, string | undefined>; keyNumbers?: PageContext["keyNumbers"] } = {},
): PageContext {
  return {
    route,
    title,
    filters: present(extra.filters ?? {}),
    keyNumbers: [{ label: "Avisos a la vista", value: String(signals.length) }, ...(extra.keyNumbers ?? [])],
    rows: signals.slice(0, CONTEXT_ROWS).map((signal) => ({
      label: signal.title,
      detail: `${signal.severity} · ${day(signal.occurredAt)} · ${signal.ruleText}`,
      provenance: contextProvenance(signal.provenance[0]),
    })),
  };
}

export function timelineContext(
  events: readonly TimelineEvent[],
  total: number,
  filters: Record<string, string | undefined> = {},
): PageContext {
  return {
    route: "/resumen",
    title: "Línea de tiempo",
    filters: present(filters),
    keyNumbers: [
      { label: "Eventos a la vista", value: String(events.length) },
      { label: "Eventos en total", value: String(total) },
    ],
    rows: events.slice(0, CONTEXT_ROWS).map((event) => ({
      label: event.title,
      detail: `${event.kind} · ${day(event.at)}${event.detail ? ` · ${event.detail}` : ""}`,
      provenance: contextProvenance(event.provenance[0]),
    })),
  };
}

/** Contratación and Competidores: public contracts on screen. */
export function contractsContext(
  route: string,
  title: string,
  contracts: readonly PublicContract[],
  keyNumbers: PageContext["keyNumbers"] = [],
): PageContext {
  return {
    route,
    title,
    keyNumbers: [{ label: "Contratos a la vista", value: String(contracts.length) }, ...keyNumbers],
    rows: contracts.slice(0, CONTEXT_ROWS).map((contract) => ({
      label: `${contract.supplierName} · ${contract.entity}`,
      detail: `Firma ${day(contract.signedAt)}${contract.endsAt ? `, fin ${day(contract.endsAt)}` : ""}, valor ${Math.round(contract.value)} COP, ${contract.status}`,
      provenance: contextProvenance(contract.provenance),
    })),
  };
}

export function briefingContext(briefing: Briefing | undefined, mode: string): PageContext {
  return {
    route: "/analisis",
    title: "Briefing",
    filters: { período: mode === "custom" ? "rango libre" : "semana anterior" },
    keyNumbers: briefing
      ? [
          { label: "Período", value: `${day(briefing.periodFrom)} a ${day(briefing.periodTo)}` },
          { label: "Estado de los avisos del período", value: String(briefing.alerts.length) },
          { label: "Avisos del período", value: String(briefing.sections.reduce((sum, section) => sum + section.signals.length, 0)) },
        ]
      : [],
    rows: briefing?.sections
      .flatMap((section) => section.signals)
      .slice(0, CONTEXT_ROWS)
      .map((signal) => ({ label: signal.title, detail: `${signal.severity} · ${day(signal.occurredAt)}`, provenance: contextProvenance(signal.provenance[0]) })),
  };
}

function latestOf(label: string, observations: readonly Observation[], provenance?: Provenance) {
  const latest = [...observations].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  if (!latest) return [];
  return [{ label: `${label} (${latest.date})`, value: `${latest.value} ${latest.unit}`, provenance: contextProvenance(provenance) }];
}

export function macroContext(series: {
  gdp: readonly Observation[];
  cpi: readonly Observation[];
  exports: readonly Observation[];
  gdpProvenance?: Provenance;
  cpiProvenance?: Provenance;
  exportsProvenance?: Provenance;
}): PageContext {
  return {
    route: "/economia",
    title: "Macroeconomía",
    keyNumbers: [
      ...latestOf("PIB real", series.gdp, series.gdpProvenance),
      ...latestOf("Inflación anual", series.cpi, series.cpiProvenance),
      ...latestOf("Exportaciones", series.exports, series.exportsProvenance),
    ],
  };
}

export function followContext(competitorNits: readonly string[], indicators: readonly string[]): PageContext {
  return {
    route: "/configuracion",
    title: "Seguimiento",
    keyNumbers: [
      { label: "Competidores seguidos", value: String(competitorNits.length) },
      { label: "Indicadores seguidos", value: indicators.join(", ") || "ninguno" },
    ],
  };
}
