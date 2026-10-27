import "@/lib/zod-config";
import { z } from "zod";
import { answerSchema, profilePatchSchema, questionSchema, seedSchema, type AiBlock, type OnboardingBlock, type Question } from "./schemas";

export const DRAFT_STAGES = ["seed", "questions", "confirm"] as const;
export type DraftStage = (typeof DRAFT_STAGES)[number];

/** The one onboarding in progress. Everything the user answered lives here, so a reload loses nothing. */
export const onboardingDraftSchema = z.object({
  seed: seedSchema.nullable(),
  stage: z.enum(DRAFT_STAGES),
  /** Questions asked so far, in order, with the ones the user may still change. */
  questions: z.array(questionSchema).max(40),
  /** Answers by question id. */
  answers: z.record(z.string(), answerSchema),
  /** Index in `questions` of the question on screen (when the stage is "questions"). */
  cursor: z.number().int().min(0),
  blocksDone: z.object({ empresa: z.boolean(), objetivos: z.boolean() }),
  /** What the AI has learned about the company so far; the live preview and the confirm form read it. */
  patch: profilePatchSchema,
  updatedAt: z.iso.datetime(),
});
export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;

/** Block on screen: the seed form belongs to "empresa" and the confirm stage to "confirmar". */
export function blockOf(draft: Pick<OnboardingDraft, "stage" | "questions" | "cursor">): OnboardingBlock {
  if (draft.stage === "confirm") return "confirmar";
  if (draft.stage === "seed") return "empresa";
  return draft.questions[draft.cursor]?.block ?? "empresa";
}

/** 1 to 3, the number of the step the stepper shows. */
export const stepNumberOf = (block: OnboardingBlock): 1 | 2 | 3 => (block === "empresa" ? 1 : block === "objetivos" ? 2 : 3);

export const questionsOfBlock = (draft: Pick<OnboardingDraft, "questions">, block: AiBlock): Question[] => draft.questions.filter((question) => question.block === block);
