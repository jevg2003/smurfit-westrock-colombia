// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useHydrationStore } from "./hydration.store";
import { ONBOARDING_DRAFT_KEY, useOnboardingDraftStore } from "./onboarding-draft.store";
import { StoreHydrator } from "./store-hydrator";

const savedDraft = {
  seed: { name: "Acme" },
  stage: "questions",
  questions: [],
  answers: {},
  cursor: 0,
  blocksDone: { empresa: false, objetivos: false },
  patch: {},
  updatedAt: "2026-10-27T10:00:00.000Z",
};

describe("StoreHydrator", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useOnboardingDraftStore.setState({ draft: null });
  });
  afterEach(cleanup);

  it("restores the onboarding draft before raising the hydrated flag", async () => {
    window.localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify({ state: { draft: savedDraft }, version: 1 }));
    render(<StoreHydrator />);
    await waitFor(() => expect(useHydrationStore.getState().hasHydrated).toBe(true));
    expect(useOnboardingDraftStore.getState().draft?.seed?.name).toBe("Acme");
  });
});
