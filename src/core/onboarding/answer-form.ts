import { z } from "zod";
import type { Answer, Question } from "./schemas";

/** Marks the "Otra" option inside the selected choices of the form. */
export const OTHER_CHOICE = "__otra__";
export const OTHER_LABEL = "Otra";
export const OTHER_MAX_CHARS = 300;

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

/** Validation of the answer form of one question. */
export function answerFormSchema(question: Pick<Question, "kind">) {
  return z
    .object({ choices: z.array(z.string()), text: z.string().trim() })
    .superRefine((values, ctx) => {
      if (question.kind === "text") {
        if (values.text === "") ctx.addIssue({ code: "custom", path: ["text"], message: MESSAGES.text });
        return;
      }
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
