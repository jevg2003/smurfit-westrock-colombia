"use client";

import { CheckIcon, RotateCcwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SettingsContent, SettingsDescription, SettingsHeader, SettingsSection, SettingsTitle } from "@/components/layouts/settings-section";
import { Skeleton } from "@/components/ui/skeleton";
import { buildConfirmValues, profileToPatch, profileToSeed, updateProfile, type ConfirmValues } from "@/core/onboarding/confirm";
import { ConfirmForm } from "@/features/onboarding/confirm-form";
import { useCompaniesStore, useCompany } from "@/stores/companies.store";
import { useHydrationStore } from "@/stores/hydration.store";
import { useOnboardingDraftStore } from "@/stores/onboarding-draft.store";

/** Starts the onboarding again for this company; asks first when another onboarding is half done. */
function ReanswerCard() {
  const router = useRouter();
  const company = useCompany();
  const startFor = useOnboardingDraftStore((state) => state.startFor);
  const [confirming, setConfirming] = useState(false);

  const go = () => {
    startFor(company);
    router.push("/onboarding");
  };
  const request = () => {
    const draft = useOnboardingDraftStore.getState().draft;
    // A draft that belongs to this company, or one with no answers yet, is not worth a warning.
    if (draft?.seed && draft.companyId !== company.id) setConfirming(true);
    else go();
  };

  return (
    <SettingsSection>
      <SettingsHeader>
        <SettingsTitle>Volver a responder el onboarding</SettingsTitle>
        <SettingsDescription>La IA vuelve a preguntar con los datos actuales de la empresa. Al terminar, se actualiza esta empresa; no se crea otra.</SettingsDescription>
      </SettingsHeader>
      <SettingsContent>
        <Button variant="outline" onClick={request}>
          <RotateCcwIcon aria-hidden="true" data-icon="inline-start" />
          Volver a responder el onboarding
        </Button>
      </SettingsContent>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hay una empresa a medias</AlertDialogTitle>
            <AlertDialogDescription>Solo puede haber un onboarding en curso. Si continúa, se pierde el que dejó sin terminar.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={go}>Reemplazar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}

/** Profile of the active company, edited with the same form as the last onboarding step. */
export function EmpresaTab() {
  const hasHydrated = useHydrationStore((state) => state.hasHydrated);
  const company = useCompany();
  const add = useCompaniesStore((state) => state.add);
  const [saved, setSaved] = useState(false);

  if (!hasHydrated) return <Skeleton role="status" aria-label="Cargando la empresa" className="h-96 rounded-xl" />;

  const save = (values: ConfirmValues) => {
    add(updateProfile(company, values, { now: new Date() }));
    setSaved(true);
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <p className="text-sm text-muted-foreground">Los datos con los que se arman las búsquedas, las reglas y las respuestas del asistente.</p>
      <ReanswerCard />
      <SettingsSection>
        <SettingsContent>
          {/* Remounts when another company is active, so the fields never show the previous one. */}
          <ConfirmForm
            key={company.id}
            defaultValues={buildConfirmValues(profileToSeed(company), profileToPatch(company))}
            submitLabel="Guardar cambios"
            embedded
            onSubmit={save}
          />
          {saved && (
            <Alert className="mt-4" role="status">
              <CheckIcon aria-hidden="true" />
              <AlertDescription>Cambios guardados.</AlertDescription>
            </Alert>
          )}
        </SettingsContent>
      </SettingsSection>
    </div>
  );
}
