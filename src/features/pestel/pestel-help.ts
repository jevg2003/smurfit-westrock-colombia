import type { Pestel } from "@/core/domain/dimension";

/** One-line help per factor, shown on each matrix card. */
export const PESTEL_HELP: Record<Pestel, string> = {
  political: "Decisiones del Estado y de entidades públicas. Aquí caen los contratos propios que vencen.",
  economic: "Precios, dólar y competidores. Aquí caen la TRM y los contratos nuevos de la competencia.",
  social: "Personas y territorio: reputación, paros y orden público. Aquí caen las menciones en prensa.",
  technological: "Cambios de tecnología en la operación o en el sector. Aún no hay reglas que alimenten este factor.",
  environmental: "Reciclaje, emisiones, agua y clima. Aquí caen las noticias de sostenibilidad.",
  legal: "Leyes, resoluciones y decretos. Aquí cae la regulación que sigue la herramienta.",
};
