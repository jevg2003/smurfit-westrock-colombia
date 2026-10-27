import type { Pestel } from "@/core/domain/dimension";

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

export const DECISION_TEMPLATES: readonly DecisionTemplate[] = [
  {
    id: "fx-cover",
    title: "¿Cubrimos la exposición cambiaria del próximo trimestre?",
    question: "Con la TRM actual, ¿conviene cubrir las compras y deudas en dólares del próximo trimestre?",
    pestelFactors: ["economic"],
    optionLabels: ["Cubrir", "Cubrir una parte", "No cubrir"],
    guide: "Mira las señales de TRM y la pantalla Macro. Piensa en tus compras y deudas en dólares.",
  },
  {
    id: "public-contracts",
    title: "¿Renovamos o licitamos los contratos públicos que vencen?",
    question: "Para los contratos propios que vencen pronto, ¿buscamos renovarlos o participamos en una nueva licitación?",
    pestelFactors: ["political", "economic"],
    optionLabels: ["Renovar", "Licitar de nuevo", "Dejar vencer"],
    guide: "Mira las señales de contratos por vencer y los contratos nuevos de los competidores.",
  },
  {
    id: "res-803",
    title: "¿Cómo respondemos a una norma nueva que nos afecta?",
    question: "Frente a las nuevas obligaciones de una norma, ¿qué acciones tomamos y en qué plazo?",
    pestelFactors: ["legal", "environmental"],
    optionLabels: ["Cumplir con un plan propio", "Buscar asesoría especializada", "Esperar aclaración de la norma"],
    guide: "Revisa el texto de la norma y confirma si aplica a la empresa y desde cuándo.",
  },
  {
    id: "energy-cost",
    title: "¿Ajustamos nuestra estrategia de energía por su precio?",
    question: "Si el precio de la energía o del gas sube o escasea, ¿cambiamos de proveedor, de contrato o de fuente?",
    pestelFactors: ["economic", "environmental"],
    optionLabels: ["Renegociar el contrato", "Mantener la estrategia actual", "Buscar otra fuente"],
    guide: "Mira el precio de bolsa en Macro y las noticias de energía, y confirma con operaciones qué margen real hay para cambiar.",
  },
];
