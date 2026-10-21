import type { Provenance } from "./provenance";

export type IndicatorId = "trm" | "pib" | "ipc_anual" | "exportaciones";

export interface Observation {
  indicatorId: IndicatorId;
  /** The period the value belongs to as the source reports it: `YYYY` (annual) or an ISO date (period end). */
  date: string;
  value: number;
  unit: string;
  provenance: Provenance;
}
