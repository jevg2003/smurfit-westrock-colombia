import type { Pestel } from "@/core/domain/dimension";
import type { SignalEvidence } from "@/core/domain/signal";

export const PESTEL_LABELS: Record<Pestel, string> = {
  political: "Político",
  economic: "Económico",
  social: "Social",
  technological: "Tecnológico",
  environmental: "Ambiental",
  legal: "Legal",
};

export const EVIDENCE_LABELS: Record<SignalEvidence["kind"], string> = {
  observation: "Dato de indicador",
  contract: "Contrato",
  news: "Noticia",
  regulation: "Norma",
};
