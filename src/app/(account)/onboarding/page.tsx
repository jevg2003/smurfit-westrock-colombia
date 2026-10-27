import { OnboardingFlow } from "@/features/onboarding/onboarding-flow";

/** `?nueva=1` comes from "Crear nueva empresa": a draft left from before then asks to continue or start over. */
export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ nueva?: string }> }) {
  const { nueva } = await searchParams;
  return <OnboardingFlow askAboutDraft={nueva === "1"} />;
}
