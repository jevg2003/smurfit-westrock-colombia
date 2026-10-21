import type { Observation } from "../domain/observation";
import type { Signal } from "../domain/signal";
import { floatingToBogotaIso } from "../time/bogota";

export const ENERGY_SPOT_WEEKLY_MOVE_RULE_ID = "energy.spot-weekly-move.v1";

/** Default week-over-week move (percent) of the national spot price that goes on watch. */
export const DEFAULT_ENERGY_SPOT_WEEKLY_MOVE_PCT = 15;
/** Default week-over-week move (percent) from which the signal is an alert. */
export const DEFAULT_ENERGY_SPOT_WEEKLY_ALERT_PCT = 30;

const WEEK = 7;
const DAY_MS = 86_400_000;

export interface EnergySpotThresholds {
  /** Week-over-week move (percent) from which the price raises a signal. Inclusive. */
  energySpotWeeklyMovePct: number;
  /** Week-over-week move (percent) from which the signal is an alert. Inclusive. */
  energySpotWeeklyAlertPct: number;
}

export interface DetectEnergySpotSignalsInput {
  /** Daily mean national spot prices (COP/kWh) in any order. */
  observations: readonly Observation[];
  thresholds: EnergySpotThresholds;
}

const dayNumber = (date: string) => Math.round(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
const mean = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const formatPct = (value: number) => value.toFixed(1).replace(".", ",");

/**
 * Compares the mean of the latest 7 daily spot prices with the 7 days before. The 14 days must be
 * contiguous; otherwise no signal is raised rather than comparing uneven windows.
 * `watch` from the move threshold, `alert` from the alert level (both inclusive, both directions).
 */
export function detectEnergySpotWeeklyMoveSignals({ observations, thresholds }: DetectEnergySpotSignalsInput): Signal[] {
  const days = observations
    .filter((obs) => obs.indicatorId === "precio_bolsa_energia")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-2 * WEEK);
  if (days.length < 2 * WEEK) return [];
  if (dayNumber(days[days.length - 1].date) - dayNumber(days[0].date) !== 2 * WEEK - 1) return [];

  const previous = mean(days.slice(0, WEEK).map((obs) => obs.value));
  const current = mean(days.slice(WEEK).map((obs) => obs.value));
  if (previous <= 0) return [];

  const changePct = ((current - previous) / previous) * 100;
  if (Math.abs(changePct) < thresholds.energySpotWeeklyMovePct) return [];

  const last = days[days.length - 1];
  return [
    {
      id: `${ENERGY_SPOT_WEEKLY_MOVE_RULE_ID}:bolsa:${last.date}`,
      ruleId: ENERGY_SPOT_WEEKLY_MOVE_RULE_ID,
      ruleText: `Precio de bolsa de energía: promedio de 7 días con variación de ${thresholds.energySpotWeeklyMovePct}% o más frente a los 7 días anteriores`,
      dimension: "macro",
      pestel: "economic",
      severity: Math.abs(changePct) >= thresholds.energySpotWeeklyAlertPct ? "alert" : "watch",
      kind: "trend",
      title: `El precio de bolsa de energía ${changePct > 0 ? "subió" : "bajó"} ${formatPct(Math.abs(changePct))}% semana a semana`,
      detail: `Promedio de ${Math.round(current)} COP/kWh en los 7 días hasta el ${last.date}, frente a ${Math.round(previous)} COP/kWh en los 7 anteriores. Alerta desde ${thresholds.energySpotWeeklyAlertPct}%.`,
      occurredAt: floatingToBogotaIso(last.date) ?? last.date,
      evidence: [{ kind: "observation", ref: `precio_bolsa_energia:${last.date}` }],
      provenance: [last.provenance],
    },
  ];
}
