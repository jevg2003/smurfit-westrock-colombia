import type { Pestel, Severity } from "../domain/dimension";
import type { Signal } from "../domain/signal";
import { type Impact, impactForRule } from "../rules/pestel-mapping";
import { compareSignals } from "./detect-signals";

export const PESTEL_ORDER: readonly Pestel[] = [
  "political",
  "economic",
  "social",
  "technological",
  "environmental",
  "legal",
];

/** Inclusive instants, ISO 8601 UTC (the shape of `BriefingPeriod.from` / `.to`). */
export interface PestelPeriod {
  from: string;
  to: string;
}

export type TrendDirection = "up" | "down" | "flat";

export interface PestelTrend {
  direction: TrendDirection;
  current: number;
  previous: number;
  /** States that this is a count comparison, not a forecast. */
  label: string;
}

export interface PestelFactorSummary {
  pestel: Pestel;
  total: number;
  bySeverity: Record<Severity, number>;
  /** Up to three signals, most severe first, then newest first. */
  top: Signal[];
  trend: PestelTrend;
  impacts: Record<Impact, number>;
}

const TOP_COUNT = 3;

function trendOf(current: number, previous: number): PestelTrend {
  const direction: TrendDirection = current > previous ? "up" : current < previous ? "down" : "flat";
  const word = { up: "Más señales", down: "Menos señales", flat: "Igual cantidad de señales" }[direction];
  return {
    direction,
    current,
    previous,
    label: `${word}. Comparación de conteos: ${current} ahora frente a ${previous} en el período anterior de igual duración. No es un pronóstico.`,
  };
}

/**
 * Groups the signals by PESTEL factor for a period: counts by severity, the top signals, the
 * count trend against the previous period of equal length, and the impact tally from the
 * per-rule table. Always returns the six factors, in fixed order.
 */
export function buildPestel(signals: readonly Signal[], period: PestelPeriod): PestelFactorSummary[] {
  const from = Date.parse(period.from);
  const to = Date.parse(period.to);
  const length = to - from + 1;
  const previousFrom = from - length;

  return PESTEL_ORDER.map((pestel) => {
    const own = signals.filter((signal) => signal.pestel === pestel);
    const inPeriod = (signal: Signal) => {
      const time = Date.parse(signal.occurredAt);
      return time >= from && time <= to;
    };
    const current = own.filter(inPeriod);
    const previous = own.filter((signal) => {
      const time = Date.parse(signal.occurredAt);
      return time >= previousFrom && time < from;
    });

    const bySeverity: Record<Severity, number> = { info: 0, watch: 0, alert: 0 };
    const impacts: Record<Impact, number> = { opportunity: 0, threat: 0, to_evaluate: 0 };
    for (const signal of current) {
      bySeverity[signal.severity] += 1;
      impacts[impactForRule(signal.ruleId)] += 1;
    }

    return {
      pestel,
      total: current.length,
      bySeverity,
      top: [...current].sort(compareSignals).slice(0, TOP_COUNT),
      trend: trendOf(current.length, previous.length),
      impacts,
    };
  });
}
