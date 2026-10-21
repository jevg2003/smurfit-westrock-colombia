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
    title: "¿Cómo respondemos a la Res. 803/2024 de envases?",
    question: "¿Qué acciones tomamos frente a las obligaciones de responsabilidad extendida del productor?",
    pestelFactors: ["legal", "environmental"],
    optionLabels: ["Cumplir con plan propio", "Cumplir con un gestor colectivo", "Esperar aclaración de la norma"],
    guide: "Revisa el texto de la norma y confirma si la empresa es productor o proveedor de empaque.",
  },
  {
    id: "energy-mix",
    title: "¿Ajustamos la mezcla energética por el precio del gas?",
    question: "Si el gas natural sube o escasea, ¿cambiamos la proporción entre gas, biomasa y electricidad?",
    pestelFactors: ["economic", "environmental"],
    optionLabels: ["Subir uso de biomasa", "Mantener la mezcla", "Buscar gas importado"],
    guide: "Mira las noticias de gas natural y confirma con planta qué margen real hay para cambiar la mezcla.",
  },
];
