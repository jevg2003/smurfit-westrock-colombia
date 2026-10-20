import type { Provenance } from "./provenance";

export type IndicatorId = "trm" | "pib" | "ipc_anual";

export interface Observation {
  indicatorId: IndicatorId;
  date: string;
  value: number;
  unit: string;
  provenance: Provenance;
}
