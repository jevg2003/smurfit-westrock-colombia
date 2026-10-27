import { afterEach, describe, expect, it, vi } from "vitest";
import type { OnboardingRequest } from "@/core/onboarding/schemas";
import { OnboardingRequestError, requestOnboardingStep } from "./api";

const request: OnboardingRequest = { seed: { name: "Acme" }, block: "empresa", answers: [] };
const ok = { nextQuestion: null, profilePatch: { sector: "Retail" }, source: "ai" };
const json = (body: unknown, status = 200) => Response.json(body, { status });

afterEach(() => vi.unstubAllGlobals());

describe("requestOnboardingStep", () => {
  it("posts the request and returns the validated response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(ok));
    await expect(requestOnboardingStep(request, { fetchImpl })).resolves.toEqual(ok);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("/api/onboarding");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(request);
  });

  it("reports an offline error when the network fails, without losing the type", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(requestOnboardingStep(request, { fetchImpl })).rejects.toMatchObject({ kind: "offline" });
  });

  it("does not even try when the browser says it is offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const fetchImpl = vi.fn();
    await expect(requestOnboardingStep(request, { fetchImpl })).rejects.toBeInstanceOf(OnboardingRequestError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports a server error for non-2xx answers and for a response that breaks the contract", async () => {
    await expect(requestOnboardingStep(request, { fetchImpl: vi.fn().mockResolvedValue(json({ error: { code: "invalid_request", message: "x" } }, 400)) })).rejects.toMatchObject({ kind: "server" });
    await expect(requestOnboardingStep(request, { fetchImpl: vi.fn().mockResolvedValue(json({ nope: true })) })).rejects.toMatchObject({ kind: "server" });
  });
});
