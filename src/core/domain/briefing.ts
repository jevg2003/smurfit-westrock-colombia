import type { Alert } from "./alert";
import type { Dimension } from "./dimension";
import type { Signal } from "./signal";

export interface Briefing {
  periodFrom: string;
  periodTo: string;
  generatedAt: string;
  sections: Array<{ dimension: Dimension; signals: Signal[] }>;
  alerts: Alert[];
  note: "generado por reglas, sin IA";
}
