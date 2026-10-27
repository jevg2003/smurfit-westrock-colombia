"use client";

import { PanelRightOpenIcon } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { OnboardingStepper } from "./onboarding-stepper";

interface OnboardingShellProps {
  step: 1 | 2 | 3;
  /** 0 to 100. */
  progress: number;
  thinking: boolean;
  onSelectStep(step: number): void;
  /** Live summary of the company; the aside on wide screens and a sheet on small ones. */
  preview: ReactNode;
  children: ReactNode;
}

/** Full-height page: thin progress bar, brand and step count, stepper and a card split in form and live summary. */
export function OnboardingShell({ step, progress, thinking, onSelectStep, preview, children }: OnboardingShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Progress value={progress} aria-label="Avance del onboarding" className="fixed inset-x-0 top-0 z-20 gap-0" />

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 pt-6 sm:px-6">
        <div className="flex items-center gap-2">
          <Image src="/icon.svg" alt="" aria-hidden="true" width={28} height={28} unoptimized priority />
          <span className="text-sm font-semibold">Smart Work Core</span>
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">Paso {step} de 3</p>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pt-6 sm:px-6">
        <OnboardingStepper step={step} thinking={thinking} onSelect={onSelectStep} />
        <Sheet>
          <SheetTrigger render={<Button variant="outline" size="sm" className="w-fit lg:hidden" />}>
            <PanelRightOpenIcon aria-hidden="true" />
            Ver resumen
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Resumen</SheetTitle>
              <SheetDescription>Lo que sabemos de su empresa hasta ahora.</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-4">{preview}</div>
          </SheetContent>
        </Sheet>
      </div>

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-start px-4 py-6 sm:px-6">
        <Card className="w-full motion-safe:animate-in motion-safe:fade-in-0 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem]">
          <CardContent className="min-w-0">{children}</CardContent>
          <aside aria-label="Resumen en vivo" className="hidden border-s bg-muted/40 px-(--card-spacing) lg:block">
            {preview}
          </aside>
        </Card>
      </main>
    </div>
  );
}
