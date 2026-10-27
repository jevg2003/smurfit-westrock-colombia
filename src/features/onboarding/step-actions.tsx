import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface StepActionsProps {
  busy: boolean;
  /** Label of the primary action. */
  submitLabel?: string;
  onBack?: () => void;
  onSkip?: () => void;
  children?: ReactNode;
}

/** Back, skip and continue of every step, in the same place and order. */
export function StepActions({ busy, submitLabel = "Continuar", onBack, onSkip, children }: StepActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      {onBack && (
        <Button type="button" variant="outline" disabled={busy} onClick={onBack}>
          Atrás
        </Button>
      )}
      {onSkip && (
        <Button type="button" variant="ghost" disabled={busy} onClick={onSkip}>
          Saltar
        </Button>
      )}
      <Button type="submit" disabled={busy} className="ms-auto">
        {submitLabel}
      </Button>
      {children}
    </div>
  );
}
