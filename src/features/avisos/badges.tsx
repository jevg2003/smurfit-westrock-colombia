import { DIMENSION_ICONS, SEVERITY_ICONS } from "@/components/events/event-icons";
import { Badge } from "@/components/reui/badge";
import type { AlertState } from "@/core/domain/alert";
import type { Dimension, Severity } from "@/core/domain/dimension";
import { ALERT_STATE_LABELS, DIMENSION_LABELS, SEVERITY_LABELS } from "@/core/labels";

const SEVERITY_VARIANT = {
  info: "info-light",
  watch: "warning-light",
  alert: "destructive-light",
} as const;

const STATE_VARIANT = {
  new: "primary-light",
  reviewed: "success-light",
  dismissed: "invert-light",
} as const;

/** Severity is always written out, never only a color. */
export function SeverityBadge({ severity }: { severity: Severity }) {
  const Icon = SEVERITY_ICONS[severity];
  return (
    <Badge variant={SEVERITY_VARIANT[severity]}>
      <Icon aria-hidden="true" className="size-3.5" />
      {SEVERITY_LABELS[severity]}
    </Badge>
  );
}

export function AlertStateBadge({ state }: { state: AlertState }) {
  return (
    <Badge variant={STATE_VARIANT[state]}>
      {ALERT_STATE_LABELS[state]}
    </Badge>
  );
}

export function DimensionBadge({ dimension }: { dimension: Dimension }) {
  const Icon = DIMENSION_ICONS[dimension];
  return (
    <Badge variant="outline">
      <Icon aria-hidden="true" className="size-3.5" />
      {DIMENSION_LABELS[dimension]}
    </Badge>
  );
}
