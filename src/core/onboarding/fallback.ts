import { MAX_QUESTIONS_PER_BLOCK, type AiBlock, type Answer, type OnboardingSeed, type ProfilePatch, type Question } from "./schemas";

/** Sector choices shown by the built-in question; the user can always write another. */
const SECTORS = ["Alimentos y bebidas", "Manufactura e industria", "Comercio y retail", "Servicios profesionales", "Construcción e infraestructura", "Energía y minería", "Agro y pesca", "Salud", "Tecnología", "Transporte y logística"];

/** Worries the user can pick, with the news and regulation terms each one adds to the search. */
const WORRIES: Readonly<Record<string, { group: "operations" | "regulation"; terms: readonly string[] }>> = {
  "Tipo de cambio": { group: "operations", terms: ["dólar Colombia", "tasa de cambio"] },
  "Costos de energía": { group: "operations", terms: ["tarifas de energía", "precio de la energía"] },
  "Transporte y logística": { group: "operations", terms: ["bloqueos vías", "paro de transportadores"] },
  "Cambios de regulación": { group: "regulation", terms: ["reforma", "decreto"] },
  "Contratación pública": { group: "regulation", terms: ["contratación pública", "Colombia Compra Eficiente"] },
  "Tasas de interés y crédito": { group: "operations", terms: ["tasa de interés Banco de la República", "crédito empresarial"] },
};

const QUESTIONS: Readonly<Record<AiBlock, readonly Question[]>> = {
  empresa: [
    { id: "fb-empresa-sector", block: "empresa", kind: "single", prompt: "¿En qué sector trabaja la empresa?", why: "Define qué noticias y normas se buscan.", options: SECTORS, allowOther: true },
    { id: "fb-empresa-clientes", block: "empresa", kind: "text", prompt: "¿Quiénes son sus principales clientes o mercados?", why: "Permite vigilar a quienes compran y a los mercados donde vende.", maxChars: 400 },
    { id: "fb-empresa-competidores", block: "empresa", kind: "text", prompt: "¿Qué empresas considera su competencia? Sepárelas con comas.", why: "Con sus nombres se siguen sus noticias.", maxChars: 400 },
    { id: "fb-empresa-insumos", block: "empresa", kind: "text", prompt: "¿Qué insumos o servicios son críticos para operar?", why: "Sus precios y su disponibilidad generan riesgos.", maxChars: 400 },
  ],
  objetivos: [
    { id: "fb-objetivos-situacion", block: "objetivos", kind: "text", prompt: "¿Dónde está hoy la empresa?", why: "Describe el punto de partida de sus decisiones.", maxChars: 600 },
    { id: "fb-objetivos-meta", block: "objetivos", kind: "text", prompt: "¿Qué desea lograr en los próximos doce meses?", why: "Las metas ordenan qué señales importan.", maxChars: 600 },
    { id: "fb-objetivos-riesgos", block: "objetivos", kind: "multi", prompt: "¿Qué le preocupa más?", why: "Cada preocupación agrega términos de búsqueda.", options: Object.keys(WORRIES), allowOther: true },
    { id: "fb-objetivos-decisiones", block: "objetivos", kind: "text", prompt: "¿Qué decisiones debe tomar pronto?", why: "Ayuda a priorizar avisos y análisis.", maxChars: 600 },
  ],
};

/** Items of a free-text list separated by commas, semicolons or new lines; empty and repeated items are dropped. */
export function splitList(raw: string): string[] {
  const seen = new Set<string>();
  return raw
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLowerCase();
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/**
 * The next built-in question of a block, or null when the block is over: the cap counts the answers of that
 * block, whoever asked the question, so a model that already asked some of them still leaves the cap intact.
 */
export function fallbackQuestion(block: AiBlock, answers: readonly Answer[]): Question | null {
  const inBlock = answers.filter((answer) => answer.block === block);
  if (inBlock.length >= MAX_QUESTIONS_PER_BLOCK[block]) return null;
  const answered = new Set(inBlock.map((answer) => answer.questionId));
  return QUESTIONS[block].find((question) => !answered.has(question.id)) ?? null;
}

const answerOf = (answers: readonly Answer[], id: string): Answer | undefined => answers.find((answer) => answer.questionId === id && !answer.skipped);
const valueOf = (answer: Answer | undefined): string => [...(answer?.selected ?? []), answer?.text ?? ""].filter(Boolean).join(", ");

/** What the answers of a block tell about the profile, without a model. `objetivos` yields the complete proposal. */
export function fallbackPatch(seed: OnboardingSeed, block: AiBlock, answers: readonly Answer[]): ProfilePatch {
  const sector = valueOf(answerOf(answers, "fb-empresa-sector"));
  const competitors = splitList(valueOf(answerOf(answers, "fb-empresa-competidores"))).map((name) => ({ name }));
  const clients = valueOf(answerOf(answers, "fb-empresa-clientes"));
  const patch: ProfilePatch = {
    ...(sector ? { sector } : {}),
    ...(clients ? { activity: clients } : {}),
    ...(competitors.length > 0 ? { competitors } : {}),
  };
  if (block === "empresa") return patch;

  const worries = (answerOf(answers, "fb-objetivos-riesgos")?.selected ?? []).flatMap((name) => (WORRIES[name] ? [WORRIES[name]] : []));
  const termsOf = (group: "operations" | "regulation") => worries.filter((worry) => worry.group === group).flatMap((worry) => [...worry.terms]);
  const priorities = splitList(valueOf(answerOf(answers, "fb-objetivos-decisiones")));
  return {
    ...patch,
    newsGroups: {
      company: { terms: [seed.name, ...competitors.map((competitor) => competitor.name)], contextTerms: [] },
      sector: { terms: sector ? [sector] : [], contextTerms: "all" },
      regulation: { terms: termsOf("regulation"), contextTerms: "all" },
      operations: { terms: termsOf("operations"), contextTerms: "all" },
    },
    goals: {
      currentSituation: answerOf(answers, "fb-objetivos-situacion")?.text ?? "",
      target: answerOf(answers, "fb-objetivos-meta")?.text ?? "",
      priorities: priorities.slice(0, 10),
    },
  };
}
