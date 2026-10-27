import type { Pestel } from "../domain/dimension";

/**
 * Written criteria: when a signal belongs to each PESTEL factor. The tag is only a label and a
 * filter; it never feeds a score.
 */
export const PESTEL_CRITERIA: Record<Pestel, string> = {
  political:
    "Decisiones del Estado o de entidades públicas que afectan al negocio: contratación pública, políticas de gobierno, relaciones con el sector público.",
  economic:
    "Precios, tipo de cambio, inflación, crecimiento, costos de energía y movimientos de competidores en el mercado.",
  social:
    "Personas y territorio: reputación, orden público, paros, relaciones con comunidades y trabajadores, menciones en prensa.",
  technological:
    "Cambios de tecnología, procesos, automatización o digitalización que afectan la operación o la competencia.",
  environmental:
    "Recursos naturales, clima, residuos, reciclaje, emisiones y sostenibilidad.",
  legal:
    "Normas, leyes, resoluciones y decretos que obligan a la empresa o cambian sus reglas de juego.",
};

/** Exact PESTEL tag per rule id, with the criterion that justifies it. */
export const PESTEL_BY_RULE: Record<string, { pestel: Pestel; criterion: string }> = {
  "trm.daily-move.v1": {
    pestel: "economic",
    criterion: "El tipo de cambio es un precio de mercado.",
  },
  "secop.expiring-contract.v1": {
    pestel: "political",
    criterion:
      "Contrato propio con una entidad pública: la renovación depende de un proceso de contratación estatal.",
  },
  "secop.competitor-new-contract.v1": {
    pestel: "economic",
    criterion: "Un competidor gana mercado: es un movimiento de competencia.",
  },
};

/** Tag by rule-id prefix, for rule families that share one criterion. */
const PESTEL_BY_PREFIX: ReadonlyArray<readonly [string, Pestel]> = [
  ["regulation.", "legal"],
  ["trm.", "economic"],
];

const FALLBACK_PESTEL: Pestel = "economic";

/** PESTEL tag of a rule: exact id first, then prefix, then `economic`. */
export function pestelForRule(ruleId: string): Pestel {
  const exact = PESTEL_BY_RULE[ruleId];
  if (exact) return exact.pestel;
  return PESTEL_BY_PREFIX.find(([prefix]) => ruleId.startsWith(prefix))?.[1] ?? FALLBACK_PESTEL;
}

export type NewsTermGroupKey = "company" | "sector" | "regulation" | "operations";

const SUSTAINABILITY_TERM = /reciclaj|aprovechamiento|sostenib|ambient|emision|carbono|circular|agua|residuo/i;
const SOCIAL_OPERATIONS_TERM = /paro|orden p[uú]blico|bloqueo|huelga|seguridad/i;

/**
 * PESTEL tag of a news item, from the term group it matched and the term itself:
 * regulation terms are legal, sustainability terms of that group are environmental,
 * operational risks are social (people and territory) or economic (prices, gas, exchange rate),
 * company mentions are social (reputation) and sector terms are economic.
 */
export function pestelForNewsTerm(group: NewsTermGroupKey, term: string): Pestel {
  switch (group) {
    case "regulation":
      return SUSTAINABILITY_TERM.test(term) ? "environmental" : "legal";
    case "operations":
      return SOCIAL_OPERATIONS_TERM.test(term) ? "social" : "economic";
    case "company":
      return "social";
    case "sector":
      return "economic";
  }
}

/** Curated norms, decrees and Minambiente publications are legal by nature. */
export function pestelForRegulation(): Pestel {
  return "legal";
}

export type Impact = "opportunity" | "threat" | "to_evaluate";

/** Impact of a rule, with the written reason shown next to it. Not an AI judgement. */
export const IMPACT_BY_RULE: Record<string, { impact: Impact; reason: string }> = {
  "trm.daily-move.v1": {
    impact: "to_evaluate",
    reason: "Depende de la dirección del cambio y de la exposición cambiaria de la empresa.",
  },
  "secop.expiring-contract.v1": {
    impact: "to_evaluate",
    reason: "Un contrato propio que vence puede renovarse o perderse: hay que decidir.",
  },
  "secop.competitor-new-contract.v1": {
    impact: "threat",
    reason: "Un competidor ganó un contrato público que la empresa no tiene.",
  },
};

/** Impact of a rule; any rule not in the table is `to_evaluate`. */
export function impactForRule(ruleId: string): Impact {
  return IMPACT_BY_RULE[ruleId]?.impact ?? "to_evaluate";
}
