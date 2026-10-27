import "@/lib/zod-config";
import { z } from "zod";
import { termList } from "@/core/company/fields";
import type { Thresholds } from "@/core/company/defaults";

export type ThresholdKey = keyof Thresholds;

/** What each threshold accepts: whole numbers only (days) and the largest value. */
const RULES: Record<ThresholdKey, { integer: boolean; max: number }> = {
  trmDailyMovePct: { integer: false, max: 50 },
  trmDailyAlertPct: { integer: false, max: 50 },
  contractExpiryWatchDays: { integer: true, max: 730 },
  contractExpiryAlertDays: { integer: true, max: 730 },
  competitorContractWindowDays: { integer: true, max: 365 },
  energySpotWeeklyMovePct: { integer: false, max: 200 },
  energySpotWeeklyAlertPct: { integer: false, max: 200 },
};

function thresholdField({ integer, max }: { integer: boolean; max: number }) {
  const base = integer ? z.int("Use un número entero de días.") : z.number("Escriba un número.");
  return base.positive("El valor debe ser mayor que cero.").max(max, `El valor no puede pasar de ${max}.`);
}

const shape = Object.fromEntries((Object.keys(RULES) as ThresholdKey[]).map((key) => [key, thresholdField(RULES[key])])) as Record<ThresholdKey, ReturnType<typeof thresholdField>>;

/** The threshold form's values: numbers, empty (undefined) while the user has not typed one. */
export type ThresholdValues = { [K in ThresholdKey]: number | undefined };

/**
 * Schema the threshold form validates with. Each field's range and "whole numbers only" are read by the
 * fields themselves; the order between a watch level and its alert level is checked on the whole form.
 */
export const thresholdsSchema = z.object(shape).superRefine((values, ctx) => {
  const alertAbove = (watch: ThresholdKey, alert: ThresholdKey) => {
    if (values[alert] < values[watch]) ctx.addIssue({ code: "custom", path: [alert], message: "El umbral de alerta debe ser igual o mayor que el de vigilar." });
  };
  alertAbove("trmDailyMovePct", "trmDailyAlertPct");
  alertAbove("energySpotWeeklyMovePct", "energySpotWeeklyAlertPct");
  if (values.contractExpiryAlertDays > values.contractExpiryWatchDays) {
    ctx.addIssue({ code: "custom", path: ["contractExpiryAlertDays"], message: "Los días de alerta deben ser igual o menores que los de vigilar." });
  }
});

/** One term list per news group, with the same limits as the company profile. */
export function termsSchema<Id extends string>(groupIds: readonly Id[]) {
  return z.object(Object.fromEntries(groupIds.map((id) => [id, termList()])) as Record<Id, ReturnType<typeof termList>>);
}

/** Context and excluded words: the same list as the terms, one schema entry per field. */
export const wordsSchema = termsSchema;
