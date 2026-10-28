"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { buildProfile, updateProfile, type ConfirmValues } from "@/core/onboarding/confirm";
import { buildRequest, nextAction } from "@/core/onboarding/flow";
import { buildPreviousProfile } from "@/core/onboarding/previous";
import { canSkip } from "@/core/onboarding/skip";
import type { Answer, OnboardingNotice, OnboardingRequest, OnboardingSeed } from "@/core/onboarding/schemas";
import { useCompaniesStore } from "@/stores/companies.store";
import { useOnboardingDraftStore } from "@/stores/onboarding-draft.store";
import { OnboardingRequestError, requestOnboardingStep, type OnboardingErrorKind } from "./api";

const draftState = () => useOnboardingDraftStore.getState();

/** The conversation with the AI and the draft: every user action lands in the persisted draft first. */
export function useOnboardingFlow() {
  const router = useRouter();
  const draft = useOnboardingDraftStore((state) => state.draft);
  const [error, setError] = useState<OnboardingErrorKind | null>(null);
  const [notice, setNotice] = useState<OnboardingNotice | null>(null);
  // Raised once the company exists: the cleared draft must not start a new one while the app opens.
  const [finished, setFinished] = useState(false);
  const { mutateAsync, isPending } = useMutation({ mutationFn: (request: OnboardingRequest) => requestOnboardingStep(request) });
  const running = useRef(false);

  /** Moves on from the current position: shows a stored question, asks the AI, or goes to the confirm step. */
  const advance = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      for (;;) {
        const current = draftState().draft;
        if (!current?.seed) return;
        const action = nextAction(current);
        if (action.type === "show") return draftState().goTo(action.cursor);
        if (action.type === "confirm") return draftState().toConfirm();

        // A round that re-answers a company starts from what it already had instead of blind.
        const existing = current.companyId ? useCompaniesStore.getState().companies.find((company) => company.id === current.companyId) : undefined;
        const response = await mutateAsync(buildRequest(current, action.block, existing ? buildPreviousProfile(existing) : undefined));
        draftState().applyPatch(response.profilePatch);
        setNotice(response.notice ?? null);
        if (response.nextQuestion) return draftState().addQuestion(response.nextQuestion);
        draftState().markBlockDone(action.block);
      }
    } catch (failure) {
      setError(failure instanceof OnboardingRequestError ? failure.kind : "server");
    } finally {
      running.current = false;
    }
  }, [mutateAsync]);

  // A draft saved right after the seed (a reload during the first request) has no question yet: ask for it.
  const needsFirstQuestion = draft?.stage === "questions" && draft.questions.length === 0;
  useEffect(() => {
    // Deferred so the request state updates never run inside the effect itself.
    if (needsFirstQuestion && error === null) queueMicrotask(() => void advance());
  }, [needsFirstQuestion, error, advance]);

  const submitSeed = (seed: OnboardingSeed) => {
    draftState().saveSeed(seed);
    // Coming back to edit the seed keeps every question; only a draft with none needs the first one.
    if (draftState().draft?.questions.length === 0) void advance();
  };

  const submitAnswer = (answer: Answer) => {
    // Skipping is only for a question that has no answer yet; a stale skip never replaces what is stored.
    if (answer.skipped && !canSkip(draftState().draft?.answers[answer.questionId])) return;
    setError(null);
    draftState().saveAnswer(answer);
    void advance();
  };

  const createCompany = (values: ConfirmValues) => {
    const current = draftState().draft;
    if (!current) return;
    const companies = useCompaniesStore.getState();
    const now = new Date();
    // A round that re-answers a company updates it; if that company is gone meanwhile, it becomes a new one.
    const existing = current.companyId ? companies.companies.find((company) => company.id === current.companyId) : undefined;
    const profile = existing ? updateProfile(existing, values, { patch: current.patch, now }) : buildProfile(values, current.patch, { id: crypto.randomUUID(), now });
    companies.add(profile);
    companies.setActive(profile.id);
    setFinished(true);
    draftState().clear();
    router.push(existing ? "/configuracion?tab=empresa" : "/resumen");
  };

  return {
    draft,
    thinking: isPending,
    finished,
    error,
    notice,
    submitSeed,
    submitAnswer,
    retry: () => {
      setError(null);
      void advance();
    },
    goBack: () => {
      setError(null);
      draftState().goBack();
    },
    goToBlock: (block: "empresa" | "objetivos") => {
      const current = draftState().draft;
      if (!current) return;
      const index = current.questions.findIndex((question) => question.block === block);
      if (index >= 0) draftState().goTo(index);
      else if (block === "empresa") draftState().goBack();
    },
    createCompany,
  };
}
