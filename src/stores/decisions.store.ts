import { create } from "zustand";
import { persist, type StateStorage } from "zustand/middleware";
import {
  type Decision,
  type DecisionError,
  type DecisionOption,
  type DecisionStatus,
  type StatusChangeInput,
  changeDecisionStatus,
  normalizeOptions,
} from "@/core/domain/decision";
import type { Pestel } from "@/core/domain/dimension";
import type { Result } from "@/core/domain/result";
import type { Clock } from "@/core/ports/clock";
import { browserStorage } from "./browser-storage";
import { systemClock } from "./system-clock";

export const DECISIONS_STORAGE_KEY = "swc:decisions:v1";

export interface DecisionDraft {
  title: string;
  question: string;
  pestelFactors: Pestel[];
  linkedSignalIds?: string[];
  options?: Array<Omit<DecisionOption, "id">>;
  owner?: string;
  reviewAt?: string;
}

/** Fields the user can edit freely. Status changes go through `setStatus`. */
export type DecisionPatch = Partial<
  Pick<Decision, "title" | "question" | "pestelFactors" | "linkedSignalIds" | "options" | "owner" | "reviewAt" | "rationale" | "chosenOption">
>;

export type DecisionStoreError = DecisionError | { kind: "not_found"; message: string };

export interface DecisionsState {
  decisions: Decision[];
  create(draft: DecisionDraft): Decision;
  update(id: string, patch: DecisionPatch): void;
  /** A rationale is required to mark a decision decided or discarded. */
  setStatus(id: string, status: DecisionStatus, input: StatusChangeInput): Result<Decision, DecisionStoreError>;
  remove(id: string): void;
}

export interface DecisionsStoreOptions {
  storage?: StateStorage;
  clock?: Clock;
  newId?: () => string;
}

const randomId = () => globalThis.crypto.randomUUID();

export function createDecisionsStore({ storage, clock = systemClock, newId = randomId }: DecisionsStoreOptions = {}) {
  return create<DecisionsState>()(
    persist(
      (set, get) => ({
        decisions: [],
        create: (draft) => {
          const now = clock.now().toISOString();
          const decision: Decision = {
            id: newId(),
            title: draft.title.trim(),
            question: draft.question.trim(),
            pestelFactors: draft.pestelFactors,
            linkedSignalIds: draft.linkedSignalIds ?? [],
            options: normalizeOptions((draft.options ?? []).map((option) => ({ ...option, id: newId() }))),
            status: "open",
            rationale: "",
            ...(draft.owner?.trim() ? { owner: draft.owner.trim() } : {}),
            ...(draft.reviewAt ? { reviewAt: draft.reviewAt } : {}),
            createdAt: now,
            updatedAt: now,
          };
          set({ decisions: [decision, ...get().decisions] });
          return decision;
        },
        update: (id, patch) => {
          const now = clock.now().toISOString();
          set({
            decisions: get().decisions.map((decision) =>
              decision.id === id
                ? {
                    ...decision,
                    ...patch,
                    ...(patch.options ? { options: normalizeOptions(patch.options) } : {}),
                    updatedAt: now,
                  }
                : decision,
            ),
          });
        },
        setStatus: (id, status, input) => {
          const current = get().decisions.find((decision) => decision.id === id);
          if (!current) return { ok: false, error: { kind: "not_found", message: "No existe esa decisión." } };
          const result = changeDecisionStatus(current, status, input, clock.now().toISOString());
          if (result.ok) set({ decisions: get().decisions.map((decision) => (decision.id === id ? result.value : decision)) });
          return result;
        },
        remove: (id) => set({ decisions: get().decisions.filter((decision) => decision.id !== id) }),
      }),
      {
        name: DECISIONS_STORAGE_KEY,
        version: 1,
        storage: browserStorage(storage),
        skipHydration: true,
        partialize: (state) => ({ decisions: state.decisions }),
      },
    ),
  );
}

export const useDecisionsStore = createDecisionsStore();
