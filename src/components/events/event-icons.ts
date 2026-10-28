import {
  EyeIcon,
  FileTextIcon,
  GavelIcon,
  GlobeIcon,
  InfoIcon,
  LandmarkIcon,
  LeafIcon,
  type LucideIcon,
  NewspaperIcon,
  RadarIcon,
  ScaleIcon,
  ScrollTextIcon,
  TrendingUpIcon,
  TriangleAlertIcon,
  UsersIcon,
  CoinsIcon,
  CpuIcon,
} from "lucide-react";
import type { Dimension, Pestel, Severity } from "@/core/domain/dimension";
import type { SignalEvidence } from "@/core/domain/signal";
import type { TimelineEvent } from "@/core/usecases/build-timeline";
import type { Origin } from "@/features/regulacion/regulacion-view";

/**
 * One icon per closed-union value. The same concept uses the same icon in every map
 * (regulation is always the scale, news always the newspaper, contracts always the document).
 */
export const DIMENSION_ICONS: Record<Dimension, LucideIcon> = {
  procurement: FileTextIcon,
  regulation: ScaleIcon,
  competitors: UsersIcon,
  market: TrendingUpIcon,
  macro: GlobeIcon,
};

export const SEVERITY_ICONS: Record<Severity, LucideIcon> = {
  info: InfoIcon,
  watch: EyeIcon,
  alert: TriangleAlertIcon,
};

export const TIMELINE_KIND_ICONS: Record<TimelineEvent["kind"], LucideIcon> = {
  signal: RadarIcon,
  contract: FileTextIcon,
  news: NewspaperIcon,
  regulation: ScaleIcon,
};

export const REGULATION_ORIGIN_ICONS: Record<Origin, LucideIcon> = {
  curated: ScrollTextIcon,
  minambiente: LandmarkIcon,
  decree: GavelIcon,
};

export const EVIDENCE_KIND_ICONS: Record<SignalEvidence["kind"], LucideIcon> = {
  observation: EyeIcon,
  contract: FileTextIcon,
  news: NewspaperIcon,
  regulation: ScaleIcon,
};

export const PESTEL_ICONS: Record<Pestel, LucideIcon> = {
  political: LandmarkIcon,
  economic: CoinsIcon,
  social: UsersIcon,
  technological: CpuIcon,
  environmental: LeafIcon,
  legal: GavelIcon,
};
