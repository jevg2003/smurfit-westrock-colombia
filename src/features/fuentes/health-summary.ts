import type { Snapshot } from "./snapshots";

export interface HealthSummary {
  working: number;
  /** Sources that are switched on: disabled ones are left out of the count. */
  enabled: number;
  tone: "success-light" | "warning-light" | "destructive-light" | "invert-light";
}

/** "N of M sources working" over the enabled sources only. An empty answer still counts as working. */
export function summarizeHealth(rows: { snapshot: Pick<Snapshot, "state"> }[]): HealthSummary {
  const enabledRows = rows.filter((row) => row.snapshot.state !== "disabled");
  const working = enabledRows.filter((row) => row.snapshot.state === "ok" || row.snapshot.state === "empty").length;
  const enabled = enabledRows.length;
  const tone = enabled === 0 ? "invert-light" : working === enabled ? "success-light" : working === 0 ? "destructive-light" : "warning-light";
  return { working, enabled, tone };
}
