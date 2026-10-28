"use client";

import { useEffect, useState } from "react";
import LatticeLoader from "@/components/react-bits/LatticeLoader/LatticeLoader";
import { Skeleton } from "@/components/ui/skeleton";
import { StepForm } from "./step-form";

/** What the AI does between a Continue and the next question, in the order it does it. */
export const THINKING_PHASES = ["Leyendo su respuesta", "Analizando su empresa", "Preparando la siguiente pregunta"] as const;

/** One field: a label bar over an input bar, the same shape as the real fields. */
function FieldSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}

interface FormSkeletonProps {
  /** Phases shown one after another while the wait lasts; the last one stays. One phase means a fixed label. */
  phases: readonly string[];
  /** Milliseconds each phase stays before the next. */
  phaseMs?: number;
}

/**
 * Placeholder of a step form: heading, fields and the Back / Continue row, built on the same layout as the real
 * form so nothing moves when the real one arrives. A lattice loader says what is happening.
 */
export function FormSkeleton({ phases, phaseMs = 2200 }: FormSkeletonProps) {
  const [index, setIndex] = useState(0);
  const last = phases.length - 1;

  useEffect(() => {
    if (index >= last) return;
    const timer = setTimeout(() => setIndex((current) => current + 1), phaseMs);
    return () => clearTimeout(timer);
  }, [index, last, phaseMs]);

  return (
    <StepForm
      aria-busy="true"
      onSubmit={(event) => event.preventDefault()}
      actions={
        <div className="flex items-center justify-between gap-2" aria-hidden="true">
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      }
    >
      <div className="text-muted-foreground">
        <LatticeLoader label={phases[Math.min(index, last)]} pattern="orbit" cellSize={5} gap={2} fontSize={13} showTimer={false} />
      </div>
      <div className="flex flex-col gap-2" aria-hidden="true">
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <FieldSkeleton />
      <FieldSkeleton />
      <FieldSkeleton />
    </StepForm>
  );
}
