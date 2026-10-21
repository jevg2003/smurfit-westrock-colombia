import type { Result } from "@/core/domain/result";
import { type BriefingError, type BriefingPeriod, type CustomRange, resolveBriefingPeriod } from "@/core/usecases/build-briefing";
import { addDaysToKey, bogotaDateKey } from "@/core/time/bogota";

export type PestelPeriodMode = "7" | "30" | "90" | "custom";

export const PESTEL_PERIOD_LABELS: Record<PestelPeriodMode, string> = {
  "7": "7 días",
  "30": "30 días",
  "90": "90 días",
  custom: "Rango libre",
};

/** Last N Bogota days including today, or a custom range (30 days while the range is missing). */
export function resolvePestelPeriod(
  now: Date,
  mode: PestelPeriodMode,
  custom?: CustomRange,
): Result<BriefingPeriod, BriefingError> {
  if (mode === "custom" && custom) return resolveBriefingPeriod(now, custom);
  const days = mode === "custom" ? 30 : Number(mode);
  const today = bogotaDateKey(now);
  return resolveBriefingPeriod(now, { fromDate: addDaysToKey(today, -(days - 1)), toDate: today });
}
