import type { Dimension, Pestel, Severity } from "./dimension";
import type { Provenance } from "./provenance";

/** Reserved for a future analyzer; empty in the MVP. */
export interface SignalAnalysis {
  summary: string;
}

export interface SignalEvidence {
  kind: "observation" | "contract" | "news" | "regulation";
  ref: string;
}

export interface Signal {
  /** Deterministic: `${ruleId}:${subject}:${date}`. */
  id: string;
  ruleId: string;
  /** Human readable rule, with the active threshold. */
  ruleText: string;
  dimension: Dimension;
  pestel: Pestel;
  severity: Severity;
  kind: "event" | "trend" | "weak_signal";
  title: string;
  detail: string;
  occurredAt: string;
  evidence: SignalEvidence[];
  provenance: Provenance[];
  analysis?: SignalAnalysis;
}
