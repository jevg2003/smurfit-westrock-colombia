import type { PublicContract } from "@/core/domain/contract";
import { daysLabel } from "@/core/rules/format";
import { daysUntil } from "@/core/time/bogota";

export interface ExpiryThresholds {
  watchDays: number;
  alertDays: number;
}

export type ExpiryLevel = "alert" | "watch" | "ok" | "neutral";

export interface ContractExpiry {
  level: ExpiryLevel;
  label: string;
  /** Whole days to the end date; undefined when the contract is finished or has no end date. */
  days?: number;
}

const FINISHED = /^terminad[oa]$/i;

/** Same windows as the `secop.expiring-contract` rule, so the badge and the signals agree. */
export function contractExpiry(contract: PublicContract, now: Date, thresholds: ExpiryThresholds): ContractExpiry {
  if (FINISHED.test(contract.status.trim())) return { level: "neutral", label: "Terminado" };
  if (!contract.endsAt) return { level: "neutral", label: "Sin fecha de fin" };

  const days = daysUntil(contract.endsAt, now);
  if (days < 0) return { level: "neutral", label: "Ya venció", days };
  if (days === 0) return { level: "alert", label: "Vence hoy", days };
  const label = `Vence en ${daysLabel(days)}`;
  if (days <= thresholds.alertDays) return { level: "alert", label, days };
  if (days <= thresholds.watchDays) return { level: "watch", label, days };
  return { level: "ok", label: "Vigente", days };
}
