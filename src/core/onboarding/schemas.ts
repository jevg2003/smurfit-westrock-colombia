import "@/lib/zod-config";
import { z } from "zod";
import { ACTIVITY_MAX, CITY_MAX, COMPETITORS_MAX, GOAL_TEXT_MAX, PRIORITIES_MAX, PRIORITY_MAX, SECTOR_MAX, TERMS_PER_GROUP_MAX, TERM_MAX, citySchema, nameSchema } from "@/core/company/fields";
import { nitDigitsSchema } from "@/core/company/nit";
import { competitorSchema, newsGroupSchema } from "@/core/company/profile";

/** Blocks in which the AI asks questions. The third block (confirm) is a form with no AI. */
export const AI_BLOCKS = ["empresa", "objetivos"] as const;
export type AiBlock = (typeof AI_BLOCKS)[number];
export type OnboardingBlock = AiBlock | "confirmar";

/** Hard cap of AI questions per block; both add up to about eight for the whole onboarding. */
export const MAX_QUESTIONS_PER_BLOCK: Readonly<Record<AiBlock, number>> = { empresa: 4, objetivos: 4 };

const text = (max: number) => z.string().trim().min(1).max(max);
const freeText = (max: number) => z.string().trim().max(max);

/** The fixed first form: only the name is required. */
export const seedSchema = z.strictObject({
  name: nameSchema,
  nit: nitDigitsSchema.optional(),
  city: citySchema.optional(),
});
export type OnboardingSeed = z.infer<typeof seedSchema>;

export const QUESTION_KINDS = ["single", "multi", "text"] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

export const questionSchema = z
  .strictObject({
    id: text(64),
    block: z.enum(AI_BLOCKS),
    kind: z.enum(QUESTION_KINDS),
    prompt: text(300),
    /** One line that tells the user why the question matters. */
    why: text(300),
    options: z.array(text(120)).min(1).max(10).optional(),
    allowOther: z.boolean().optional(),
    maxChars: z.number().int().min(20).max(2000).optional(),
  })
  .refine((question) => question.kind === "text" || question.options !== undefined, { message: "Las preguntas de selección necesitan opciones.", path: ["options"] });
export type Question = z.infer<typeof questionSchema>;

/** What the user answered; the prompt travels with it so the model sees question and answer together. */
export const answerSchema = z.strictObject({
  questionId: text(64),
  block: z.enum(AI_BLOCKS),
  prompt: text(300),
  selected: z.array(text(120)).max(10),
  text: freeText(2000),
  skipped: z.boolean(),
});
export type Answer = z.infer<typeof answerSchema>;

export const MAX_ANSWERS = 20;

export const onboardingRequestSchema = z.strictObject({
  seed: seedSchema,
  block: z.enum(AI_BLOCKS),
  answers: z.array(answerSchema).max(MAX_ANSWERS),
});
export type OnboardingRequest = z.infer<typeof onboardingRequestSchema>;

const words = (maxItems: number) => z.array(text(TERM_MAX)).max(maxItems);

/** Fields the onboarding can fill in a profile. All optional: a patch only carries what the AI learned. */
export const profilePatchSchema = z
  .strictObject({
    sector: freeText(SECTOR_MAX),
    activity: freeText(ACTIVITY_MAX),
    city: freeText(CITY_MAX),
    regions: words(20),
    competitors: z.array(competitorSchema).max(COMPETITORS_MAX),
    newsGroups: z.strictObject({ company: newsGroupSchema, sector: newsGroupSchema, regulation: newsGroupSchema, operations: newsGroupSchema }),
    colombiaContextWords: words(TERMS_PER_GROUP_MAX),
    excludeWords: words(TERMS_PER_GROUP_MAX),
    regulationKeywords: words(60),
    regulationExcludeKeywords: words(TERMS_PER_GROUP_MAX),
    goals: z.strictObject({ currentSituation: freeText(GOAL_TEXT_MAX), target: freeText(GOAL_TEXT_MAX), priorities: z.array(text(PRIORITY_MAX)).max(PRIORITIES_MAX) }).partial(),
  })
  .partial();
export type ProfilePatch = z.infer<typeof profilePatchSchema>;

export const NOTICE_CODES = ["ai_unavailable", "ai_not_configured", "ai_invalid_output"] as const;
export const noticeSchema = z.strictObject({ code: z.enum(NOTICE_CODES), message: text(300) });
export type OnboardingNotice = z.infer<typeof noticeSchema>;

export const onboardingResponseSchema = z.strictObject({
  /** Null when the block has all it needs. */
  nextQuestion: questionSchema.nullable(),
  profilePatch: profilePatchSchema,
  source: z.enum(["ai", "fallback"]),
  notice: noticeSchema.optional(),
});
export type OnboardingResponse = z.infer<typeof onboardingResponseSchema>;
