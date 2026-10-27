"use client";

import { CheckIcon } from "lucide-react";
import { Stepper, StepperIndicator, StepperItem, StepperNav, StepperSeparator, StepperTitle, StepperTrigger } from "@/components/reui/stepper";
import { cn } from "@/lib/utils";

export const ONBOARDING_STEPS = ["Empresa", "Objetivos", "Confirmar"] as const;

/** Dashed ring; it spins while the AI is thinking. 28 units of path make the 3:1 dashes close evenly. */
function DashedRing({ spin = false }: { spin?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={cn("size-4", spin && "motion-safe:animate-spin")}>
      <circle cx="8" cy="8" r="4.5" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 1" pathLength={28} />
    </svg>
  );
}

const indicators = {
  completed: <CheckIcon className="size-2.5 stroke-[3.36]" aria-hidden="true" />,
  inactive: <DashedRing />,
  loading: <DashedRing spin />,
};

interface OnboardingStepperProps {
  /** 1 to 3. */
  step: 1 | 2 | 3;
  thinking: boolean;
  /** Called with an earlier step the user clicks to review it. */
  onSelect(step: number): void;
}

/** The three fixed blocks (ReUI c-stepper-29, with the theme's primary color instead of a palette blue). */
export function OnboardingStepper({ step, thinking, onSelect }: OnboardingStepperProps) {
  return (
    <Stepper value={step} onValueChange={(next) => next < step && onSelect(next)} indicators={indicators} aria-label="Pasos del onboarding">
      <StepperNav className="gap-1">
        {ONBOARDING_STEPS.map((title, index) => {
          const number = index + 1;
          return (
            <StepperItem key={title} step={number} loading={thinking} disabled={number > step} className="gap-1.5">
              <StepperTrigger className="-m-1 gap-1.5 p-1">
                <StepperIndicator className="size-4 bg-ring/20 text-ring/50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=completed]:bg-primary data-[state=completed]:text-primary-foreground" />
                <StepperTitle className="whitespace-nowrap data-[state=inactive]:text-muted-foreground">{title}</StepperTitle>
                {number < step && <span className="sr-only">, completado</span>}
              </StepperTrigger>
              {number < ONBOARDING_STEPS.length && (
                <StepperSeparator className="m-0 min-w-6 bg-transparent bg-linear-to-r from-primary to-ring/20 data-[state=inactive]:from-ring/20 data-[state=completed]:to-primary rtl:bg-linear-to-l" />
              )}
            </StepperItem>
          );
        })}
      </StepperNav>
    </Stepper>
  );
}
