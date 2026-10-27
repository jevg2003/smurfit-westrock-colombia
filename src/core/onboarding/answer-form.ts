import { z } from "zod";
import type { Answer, Question } from "./schemas";

/** Marks the "Otra" option inside the selected choices of the form. */
export const OTHER_CHOICE = "__otra__";
export const OTHER_LABEL = "Otra";
/** Limit of the free text next to the choices of a selection question. */
export const OTHER_MAX_CHARS = 300;
/** Limit of an open question that does not carry its own `maxChars`. */
export const DEFAULT_TEXT_CHARS = 400;

export interface AnswerFormValues {
  choices: string[];
  text: string;
}

const MESSAGES = {
  single: "Elija una opción o escriba otra respuesta.",
  multi: "Elija al menos una opción o escriba otra respuesta.",
  text: "Escriba su respuesta o salte la pregunta.",
  other: "Escriba su respuesta en el recuadro.",
} as const;

const tooLong = (max: number) => `Use ${max} caracteres como máximo.`;

/**
 * Validation of the answer form of one question. It is also where the form takes its limits from: the text of an
 * open question stops at the question's `maxChars`, and the free text of a selection question at `OTHER_MAX_CHARS`.
 */
export function answerFormSchema(question: Pick<Question, "kind" | "maxChars">) {
  if (question.kind === "text") {
    const max = question.maxChars ?? DEFAULT_TEXT_CHARS;
    return z.object({ choices: z.array(z.string()), text: z.string().trim().min(1, MESSAGES.text).max(max, tooLong(max)) });
  }
  return z
    .object({ choices: z.array(z.string()), text: z.string().trim().max(OTHER_MAX_CHARS, tooLong(OTHER_MAX_CHARS)) })
    .superRefine((values, ctx) => {
      const usesOther = values.choices.includes(OTHER_CHOICE);
      if (values.choices.length === 0) ctx.addIssue({ code: "custom", path: ["choices"], message: MESSAGES[question.kind] });
      else if (usesOther && values.text === "") ctx.addIssue({ code: "custom", path: ["text"], message: MESSAGES.other });
    });
}

/** The form values of a question, from the answer saved before (if any). */
export function initialAnswerValues(question: Pick<Question, "kind">, answer: Answer | undefined): AnswerFormValues {
  if (!answer || answer.skipped) return { choices: [], text: "" };
  if (question.kind === "text") return { choices: [], text: answer.text };
  return { choices: [...answer.selected, ...(answer.text ? [OTHER_CHOICE] : [])], text: answer.text };
}

export function toAnswer(question: Pick<Question, "id" | "block" | "prompt" | "kind">, values: AnswerFormValues): Answer {
  const usesText = question.kind === "text" || values.choices.includes(OTHER_CHOICE);
  return {
    questionId: question.id,
    block: question.block,
    prompt: question.prompt,
    selected: values.choices.filter((choice) => choice !== OTHER_CHOICE),
    text: usesText ? values.text.trim() : "",
    skipped: false,
  };
}

export const skippedAnswer = (question: Pick<Question, "id" | "block" | "prompt">): Answer => ({
  questionId: question.id,
  block: question.block,
  prompt: question.prompt,
  selected: [],
  text: "",
  skipped: true,
});
