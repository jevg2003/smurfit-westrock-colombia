import type { Observation } from "@/core/domain/observation";

export interface ObservationEvent {
  id: string;
  /** Instant at the end of the period (noon UTC of its last day). */
  at: string;
  period: string;
  value: string;
  /** Change against the previous observation, signed; absent for the oldest one. */
  change?: string;
}

interface Options {
  /** `points` for rates (percentage points), `percent` for amounts (relative change). */
  mode: "points" | "percent";
  period: (observation: Observation) => string;
  value: (observation: Observation) => string;
  limit?: number;
}

const SIGNED = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "always" });
const SIGNED_1 = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "always" });

/** A year ("2025") ends on 31 December; a day or quarter end ("2026-06-30") is already a day. */
function endOfPeriod(date: string): string {
  const day = /^\d{4}$/.test(date) ? `${date}-12-31` : date;
  return `${day}T12:00:00.000Z`;
}

/** Observations of a series as events, newest first, each with its change against the one before. */
export function observationEvents(observations: readonly Observation[], { mode, period, value, limit }: Options): ObservationEvent[] {
  const events = observations.map((observation, index): ObservationEvent => {
    const previous = observations[index - 1];
    let change: string | undefined;
    if (previous) {
      change =
        mode === "points"
          ? `${SIGNED.format(observation.value - previous.value)} pts`
          : previous.value === 0
            ? undefined
            : `${SIGNED_1.format(((observation.value - previous.value) / previous.value) * 100)} %`;
    }
    return { id: `${observation.indicatorId}:${observation.date}`, at: endOfPeriod(observation.date), period: period(observation), value: value(observation), ...(change ? { change } : {}) };
  });
  const newestFirst = events.reverse();
  return limit ? newestFirst.slice(0, limit) : newestFirst;
}
