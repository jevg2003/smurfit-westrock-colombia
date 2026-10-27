"use client";

import { WifiOffIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { blockOf, progressOf, stepNumberOf } from "@/core/onboarding/draft";
import { useHydrationStore } from "@/stores/hydration.store";
import { useOnboardingDraftStore } from "@/stores/onboarding-draft.store";
import type { OnboardingErrorKind } from "./api";
import { ConfirmForm } from "./confirm-form";
import { OnboardingShell } from "./onboarding-shell";
import { ProfilePreview } from "./profile-preview";
import { QuestionForm } from "./question-form";
import { SeedForm } from "./seed-form";
import { useOnboardingFlow } from "./use-onboarding-flow";

const ERROR_TEXT: Record<OnboardingErrorKind, string> = {
  offline: "Sin conexión. Sus respuestas están guardadas.",
  server: "No pudimos preparar la siguiente pregunta. Sus respuestas están guardadas.",
};

/** Page to decide what to do with a draft left from before, when the user asked for a new company. */
function DraftPrompt({ name, onContinue, onRestart }: { name: string; onContinue(): void; onRestart(): void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Tiene una empresa a medias</CardTitle>
          <CardDescription>{name ? `Dejó sin terminar a ${name}.` : "Dejó una empresa sin terminar."} Puede seguir donde quedó o empezar de nuevo.</CardDescription>
        </CardHeader>
        <CardFooter className="flex-wrap gap-2">
          <Button onClick={onContinue}>Continuar</Button>
          <Button variant="outline" onClick={onRestart}>
            Empezar de nuevo
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}

export function OnboardingFlow({ askAboutDraft }: { askAboutDraft: boolean }) {
  const router = useRouter();
  const hasHydrated = useHydrationStore((state) => state.hasHydrated);
  const start = useOnboardingDraftStore((state) => state.start);
  const flow = useOnboardingFlow();
  const { draft, thinking, error, notice, finished } = flow;
  const [resolved, setResolved] = useState(!askAboutDraft);

  const mustAsk = askAboutDraft && !resolved && draft?.seed != null;
  useEffect(() => {
    if (hasHydrated && !draft && !mustAsk && !finished) start();
  }, [hasHydrated, draft, mustAsk, finished, start]);

  if (!hasHydrated || !draft) return <Skeleton role="status" aria-label="Cargando" className="m-6 h-96 rounded-xl" />;

  if (mustAsk) {
    return (
      <DraftPrompt
        name={draft.seed?.name ?? ""}
        onContinue={() => {
          setResolved(true);
          router.replace("/onboarding");
        }}
        onRestart={() => {
          start();
          setResolved(true);
          router.replace("/onboarding");
        }}
      />
    );
  }

  const question = draft.stage === "questions" ? draft.questions[draft.cursor] : undefined;
  const isLast = question !== undefined && draft.cursor === draft.questions.length - 1;

  return (
    <OnboardingShell
      step={stepNumberOf(blockOf(draft))}
      progress={progressOf(draft)}
      thinking={thinking}
      onSelectStep={(next) => flow.goToBlock(next === 1 ? "empresa" : "objetivos")}
      preview={<ProfilePreview draft={draft} />}
    >
      <div className="flex flex-col gap-5">
        {error && (
          <Alert variant="destructive">
            {error === "offline" && <WifiOffIcon aria-hidden="true" />}
            <AlertDescription>{ERROR_TEXT[error]}</AlertDescription>
            <AlertAction>
              <Button size="sm" variant="outline" onClick={flow.retry}>
                Reintentar
              </Button>
            </AlertAction>
          </Alert>
        )}
        {!error && notice && (
          <Alert>
            <AlertDescription>{notice.message}</AlertDescription>
          </Alert>
        )}

        {draft.stage === "seed" && <SeedForm key="seed" seed={draft.seed} busy={thinking} onSubmit={flow.submitSeed} />}

        {draft.stage === "questions" && question && (
          <QuestionForm key={question.id} question={question} answer={draft.answers[question.id]} busy={thinking} onSubmit={flow.submitAnswer} onBack={flow.goBack} />
        )}
        {draft.stage === "questions" && thinking && (isLast || !question) && <Skeleton role="status" aria-label="Preparando la siguiente pregunta" className="h-16" />}

        {draft.stage === "confirm" && draft.seed && (
          <ConfirmForm seed={draft.seed} patch={draft.patch} busy={thinking} onBack={flow.goBack} onSubmit={flow.createCompany} />
        )}
      </div>
    </OnboardingShell>
  );
}
