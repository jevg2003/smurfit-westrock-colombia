import type { Signal } from "./signal";

export type AlertState = "new" | "reviewed" | "dismissed";

export interface Alert {
  signalId: string;
  state: AlertState;
  note?: string;
  createdAt: string;
  updatedAt: string;
  /** Copy of the signal at creation time, so the alert survives source changes. */
  signalSnapshot: Signal;
}
