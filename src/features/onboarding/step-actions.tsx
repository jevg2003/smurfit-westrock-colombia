import { Button } from "@/components/ui/button";

interface StepActionsProps {
  busy: boolean;
  /** Label of the primary action. */
  submitLabel?: string;
  onBack?: () => void;
  onSkip?: () => void;
}

/** Back on the left; skip and continue on the right. The row has the same shape on every step. */
export function StepActions({ busy, submitLabel = "Continuar", onBack, onSkip }: StepActionsProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      {onBack ? (
        <Button type="button" variant="outline" disabled={busy} onClick={onBack}>
          Atrás
        </Button>
      ) : (
        <span aria-hidden="true" />
      )}
      <div className="flex items-center gap-2">
        {onSkip && (
          <Button type="button" variant="ghost" disabled={busy} onClick={onSkip}>
            Saltar
          </Button>
        )}
        <Button type="submit" disabled={busy}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
