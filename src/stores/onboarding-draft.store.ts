import "@/lib/zod-config";
import { create } from "zustand";
import { persist, type StateStorage } from "zustand/middleware";
import { onboardingDraftSchema, type OnboardingDraft } from "@/core/onboarding/draft";
import type { AiBlock, Answer, OnboardingSeed, ProfilePatch, Question } from "@/core/onboarding/schemas";
import type { Clock } from "@/core/ports/clock";
import { browserStorage } from "./browser-storage";
import { systemClock } from "./system-clock";

export const ONBOARDING_DRAFT_KEY = "swc:onboarding:draft:v1";

export interface OnboardingDraftState {
  /** Null until the user starts an onboarding; only one exists at a time. */
  draft: OnboardingDraft | null;
  /** Begins an empty onboarding, replacing any previous one. */
  start(): void;
  /** Saves the first form and moves on to the questions (or back to where the user was). */
  saveSeed(seed: OnboardingSeed): void;
  /** Appends a question the AI just asked and shows it. A question already stored is only shown. */
  addQuestion(question: Question): void;
  saveAnswer(answer: Answer): void;
  goTo(cursor: number): void;
  goBack(): void;
  toConfirm(): void;
  markBlockDone(block: AiBlock): void;
  applyPatch(patch: ProfilePatch): void;
  clear(): void;
}

export interface OnboardingDraftStoreOptions {
  storage?: StateStorage;
  clock?: Clock;
}

export function createOnboardingDraftStore({ storage, clock = systemClock }: OnboardingDraftStoreOptions = {}) {
  const emptyDraft = (): OnboardingDraft => ({
    seed: null,
    stage: "seed",
    questions: [],
    answers: {},
    cursor: 0,
    blocksDone: { empresa: false, objetivos: false },
    patch: {},
    updatedAt: clock.now().toISOString(),
  });

  return create<OnboardingDraftState>()(
    persist(
      (set) => {
        /** Applies a change to the draft and stamps it; a call with no draft does nothing. */
        const change = (update: (draft: OnboardingDraft) => Partial<OnboardingDraft>) =>
          set((state) => (state.draft ? { draft: { ...state.draft, ...update(state.draft), updatedAt: clock.now().toISOString() } } : state));

        return {
          draft: null,
          start: () => set({ draft: emptyDraft() }),
          saveSeed: (seed) => change((draft) => ({ seed, stage: "questions", cursor: Math.min(draft.cursor, Math.max(draft.questions.length - 1, 0)) })),
          addQuestion: (question) =>
            change((draft) => {
              const existing = draft.questions.findIndex((item) => item.id === question.id);
              if (existing >= 0) return { cursor: existing };
              return { questions: [...draft.questions, question], cursor: draft.questions.length };
            }),
          saveAnswer: (answer) => change((draft) => ({ answers: { ...draft.answers, [answer.questionId]: answer } })),
          goTo: (cursor) => change((draft) => ({ stage: "questions", cursor: Math.min(Math.max(cursor, 0), Math.max(draft.questions.length - 1, 0)) })),
          goBack: () =>
            change((draft) => {
              if (draft.stage === "confirm") return { stage: "questions", cursor: Math.max(draft.questions.length - 1, 0) };
              if (draft.stage === "questions" && draft.cursor > 0) return { cursor: draft.cursor - 1 };
              return { stage: "seed" };
            }),
          toConfirm: () => change(() => ({ stage: "confirm" })),
          markBlockDone: (block) => change((draft) => ({ blocksDone: { ...draft.blocksDone, [block]: true } })),
          applyPatch: (patch) => change((draft) => ({ patch: { ...draft.patch, ...patch } })),
          clear: () => set({ draft: null }),
        };
      },
      {
        name: ONBOARDING_DRAFT_KEY,
        version: 1,
        storage: browserStorage(storage),
        skipHydration: true,
        partialize: (state) => ({ draft: state.draft }),
        // A saved draft that does not pass the schema is dropped, so corrupt JSON never breaks the screen.
        merge: (persisted, current) => {
          const parsed = onboardingDraftSchema.safeParse((persisted as { draft?: unknown } | undefined)?.draft);
          return { ...current, draft: parsed.success ? parsed.data : null };
        },
      },
    ),
  );
}

export const useOnboardingDraftStore = createOnboardingDraftStore();
