import type { DecisionStatus } from "./domain/decision";
import type { AlertState } from "./domain/alert";
import type { Dimension, Severity } from "./domain/dimension";
import type { IndicatorId } from "./domain/observation";
import type { Impact } from "./rules/pestel-mapping";

/** Fixed display order of the dimensions in briefings. */
export const DIMENSION_ORDER: readonly Dimension[] = ["procurement", "competitors", "market", "regulation", "macro"];

export const DIMENSION_LABELS: Record<Dimension, string> = {
  procurement: "Contratación",
  competitors: "Competidores",
  market: "Mercado",
  regulation: "Regulación",
  macro: "Macroeconomía",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  info: "Informativa",
  watch: "Vigilar",
  alert: "Alerta",
};

export const ALERT_STATE_LABELS: Record<AlertState, string> = {
  new: "Nueva",
  reviewed: "Revisada",
  dismissed: "Descartada",
};

export const INDICATOR_LABELS: Record<IndicatorId, string> = {
  trm: "TRM (dólar)",
  pib: "PIB real",
  ipc_anual: "Inflación anual (IPC)",
  exportaciones: "Exportaciones",
  precio_bolsa_energia: "Precio de bolsa de energía",
};

export const IMPACT_LABELS: Record<Impact, string> = {
  opportunity: "Oportunidad",
  threat: "Amenaza",
  to_evaluate: "Por evaluar",
};

export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  open: "Abierta",
  evaluating: "En evaluación",
  decided: "Decidida",
  discarded: "Descartada",
};
