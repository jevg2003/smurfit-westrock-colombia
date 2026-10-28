import type { Pestel } from "@/core/domain/dimension";
import { hasNit, type CompanyProfile } from "@/core/company/profile";
import { normalizeText } from "@/core/text/match";

/** A starting point for a decision. It is a plantilla, not data: nothing here comes from a source. */
export interface DecisionTemplate {
  id: string;
  title: string;
  question: string;
  pestelFactors: Pestel[];
  /** Suggested option names. Pros and cons are left for the user. */
  optionLabels: string[];
  /** What to look at before deciding. */
  guide: string;
}

const MAX_PRIORITY_TEMPLATES = 3;

const FX_WORDS = ["dolar", "dolares", "importa", "importacion", "importaciones", "exporta", "exportar", "exportacion", "exportaciones", "divisas", "cambiario", "tasa de cambio", "trm"];
const ENERGY_WORDS = ["energia", "gas", "electricidad", "combustible", "combustibles"];

const GENERIC: readonly DecisionTemplate[] = [
  {
    id: "new-regulation",
    title: "¿Cómo respondemos a una norma nueva que nos afecta?",
    question: "Frente a las nuevas obligaciones de una norma, ¿qué acciones tomamos y en qué plazo?",
    pestelFactors: ["legal"],
    optionLabels: ["Cumplir con un plan propio", "Buscar asesoría especializada", "Esperar aclaración de la norma"],
    guide: "Revise el texto de la norma y confirme si aplica a la empresa y desde cuándo.",
  },
];

const FX: DecisionTemplate = {
  id: "fx-cover",
  title: "¿Cubrimos la exposición cambiaria del próximo trimestre?",
  question: "Con la TRM actual, ¿conviene cubrir las compras, ventas y deudas en dólares del próximo trimestre?",
  pestelFactors: ["economic"],
  optionLabels: ["Cubrir", "Cubrir una parte", "No cubrir"],
  guide: "Revise los avisos de TRM y la pantalla Economía. Piense en lo que la empresa compra, vende o debe en dólares.",
};

const ENERGY: DecisionTemplate = {
  id: "energy-cost",
  title: "¿Ajustamos nuestra estrategia de energía por su precio?",
  question: "Si el precio de la energía o del gas sube o escasea, ¿cambiamos de proveedor, de contrato o de fuente?",
  pestelFactors: ["economic", "environmental"],
  optionLabels: ["Renegociar el contrato", "Mantener la estrategia actual", "Buscar otra fuente"],
  guide: "Revise el precio de bolsa en Economía y las noticias de energía, y confirme con operaciones qué margen real hay para cambiar.",
};

const PUBLIC_CONTRACTS: DecisionTemplate = {
  id: "public-contracts",
  title: "¿Renovamos o licitamos los contratos públicos que vencen?",
  question: "Para los contratos propios que vencen pronto, ¿buscamos renovarlos o participamos en una nueva licitación?",
  pestelFactors: ["political", "economic"],
  optionLabels: ["Renovar", "Licitar de nuevo", "Dejar vencer"],
  guide: "Revise los avisos de contratos por vencer y los contratos nuevos de los competidores.",
};

function competitorTemplate(profile: CompanyProfile): DecisionTemplate {
  const first = profile.competitors[0]?.name;
  const who = first ? `${first}` : "un competidor";
  return {
    id: "competitor-move",
    title: first ? `¿Cómo respondemos si ${who} cambia su posición?` : "¿Cómo respondemos si un competidor cambia su posición?",
    question: `Si ${who} cambia precios, gana un cliente grande o lanza algo nuevo, ¿qué hacemos y cuándo?`,
    pestelFactors: ["economic"],
    optionLabels: ["Responder de inmediato", "Observar unas semanas", "Mantener nuestro rumbo"],
    guide: "Revise las noticias y los avisos del competidor en Radar y confirme con ventas qué clientes están en juego.",
  };
}

function priorityTemplate(priority: string, index: number): DecisionTemplate {
  return {
    id: `priority-${index + 1}`,
    title: `¿Qué decisión pendiente tenemos sobre «${priority}»?`,
    question: `Para avanzar en «${priority}», ¿qué decisión hay que tomar ahora y quién la toma?`,
    pestelFactors: [],
    optionLabels: ["Decidir ahora", "Reunir más información", "Aplazar"],
    guide: "Revise los avisos que coinciden con esta prioridad y defina qué tendría que pasar para decidir.",
  };
}

const mentions = (text: string, words: readonly string[]): boolean => {
  const haystack = ` ${normalizeText(text)} `;
  return words.some((word) => haystack.includes(` ${normalizeText(word)} `));
};

/**
 * The templates that make sense for this company, from its profile only: the generic ones always,
 * public contracts with a NIT, exchange rate and energy when the company's own words point there,
 * and one per priority. Pure; nothing the user has to configure.
 */
export function decisionTemplatesFor(profile: CompanyProfile): DecisionTemplate[] {
  const corpus = [profile.activity, profile.sector ?? "", profile.goals.currentSituation, profile.goals.target, ...profile.goals.priorities, ...profile.newsGroups.operations.terms, ...profile.newsGroups.sector.terms].join(" . ");
  return [
    ...GENERIC,
    competitorTemplate(profile),
    ...(hasNit(profile) ? [PUBLIC_CONTRACTS] : []),
    ...(mentions(corpus, FX_WORDS) ? [FX] : []),
    ...(mentions(corpus, ENERGY_WORDS) ? [ENERGY] : []),
    ...profile.goals.priorities.slice(0, MAX_PRIORITY_TEMPLATES).map(priorityTemplate),
  ];
}
