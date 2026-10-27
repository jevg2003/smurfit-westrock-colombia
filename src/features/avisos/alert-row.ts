import type { Alert } from "@/core/domain/alert";
import type { Signal } from "@/core/domain/signal";

/** A signal with its review alert. */
export interface AlertRow {
  signal: Signal;
  alert: Alert;
}
