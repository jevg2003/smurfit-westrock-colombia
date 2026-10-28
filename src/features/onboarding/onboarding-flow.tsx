"use client";

import { WifiOffIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { buildConfirmValues } from "@/core/onboarding/confirm";
import { blockOf, progressOf, stepNumberOf } from "@/core/onboarding/draft";
import { useHydrationStore } from "@/stores/hydration.store";
import { useOnboardingDraftStore } from "@/stores/onboarding-draft.store";
import type { OnboardingErrorKind } from "./api";
import { ConfirmForm } from "./confirm-form";
import { FormSkeleton, THINKING_PHASES } from "./form-skeleton";
import { OnboardingShell } from "./onboarding-shell";
import { ProfilePreview } from "./profile-preview";
import { QuestionForm } from "./question-form";
import { SeedForm } from "./seed-form";
import { useOnboardingFlow } from "./use-onboarding-flow";

/** Shown while the saved draft is read back from the browser (a reload). */
const LOADING_PHASES = ["Recuperando su avance"] as const;

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

  if (!hasHydrated || !draft) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl items-center px-4 py-6">
        <Card className="w-full gap-0 py-0">
          <FormSkeleton phases={LOADING_PHASES} />
        </Card>
      </main>
    );
  }

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
  // The user just continued from the last question (or the first one is not here yet): the AI is writing the next.
  const waitingForAi = draft.stage === "questions" && thinking && (isLast || !question);

  return (
    <OnboardingShell
      step={stepNumberOf(blockOf(draft))}
      progress={progressOf(draft)}
      thinking={thinking}
      onSelectStep={(next) => flow.goToBlock(next === 1 ? "empresa" : "objetivos")}
      preview={<ProfilePreview draft={draft} />}
      summary={<ProfilePreview draft={draft} variant="list" />}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 flex-col gap-3 px-4 pt-4 empty:hidden">
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
        </div>

        {draft.stage === "seed" && <SeedForm key="seed" seed={draft.seed} busy={thinking} onSubmit={flow.submitSeed} />}

        {waitingForAi && <FormSkeleton phases={THINKING_PHASES} />}

        {draft.stage === "questions" && question && !waitingForAi && (
          <QuestionForm key={question.id} question={question} answer={draft.answers[question.id]} busy={thinking} onSubmit={flow.submitAnswer} onBack={flow.goBack} />
        )}
        {draft.stage === "confirm" && draft.seed && (
          <ConfirmForm
            defaultValues={buildConfirmValues(draft.seed, draft.patch)}
            busy={thinking}
            submitLabel={draft.companyId ? "Guardar cambios" : "Crear empresa"}
            intro={{ title: draft.companyId ? "Confirme los cambios" : "Confirme su empresa", description: "Revise lo que preparamos. Puede cambiarlo ahora o después en Configuración." }}
            onBack={flow.goBack}
            onSubmit={flow.createCompany}
          />
        )}
      </div>
    </OnboardingShell>
  );
}
