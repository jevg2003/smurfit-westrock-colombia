import { handleOnboarding } from "@/infrastructure/ai/onboarding";
import { resolveModel } from "@/infrastructure/ai/model";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Next question (or the final proposal) of the company onboarding. Keys are read from the server environment only. */
export async function POST(request: Request) {
  return handleOnboarding(request, { resolve: () => resolveModel(process.env) });
}
