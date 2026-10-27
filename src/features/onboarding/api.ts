import { onboardingResponseSchema, type OnboardingRequest, type OnboardingResponse } from "@/core/onboarding/schemas";

export type OnboardingErrorKind = "offline" | "server";

/** Typed failure of a step request, so the screen can say what happened and offer to retry. */
export class OnboardingRequestError extends Error {
  readonly kind: OnboardingErrorKind;
  constructor(kind: OnboardingErrorKind) {
    super(kind === "offline" ? "Sin conexión." : "El servidor no pudo continuar.");
    this.name = "OnboardingRequestError";
    this.kind = kind;
  }
}

export interface RequestOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

/** Asks the server for the next question (or the final proposal). */
export async function requestOnboardingStep(request: OnboardingRequest, { fetchImpl = fetch, signal }: RequestOptions = {}): Promise<OnboardingResponse> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new OnboardingRequestError("offline");

  let response: Response;
  try {
    response = await fetchImpl("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new OnboardingRequestError("offline");
  }
  if (!response.ok) throw new OnboardingRequestError("server");

  const parsed = onboardingResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new OnboardingRequestError("server");
  return parsed.data;
}
