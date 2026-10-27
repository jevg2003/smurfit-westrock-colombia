"use client";

import { ArrowRightIcon } from "lucide-react";
import SpecularButton from "@/components/react-bits/SpecularButton/SpecularButton";
import { CTA_LABEL, ENTER_HREF } from "./shared";

/**
 * The same call to action as `EnterButton`, with a light that follows the pointer along the edge.
 * It is still a plain link to the app (no prefetch, see `EnterButton`). Colors come from the
 * landing tokens, so the button flips from ink to lime with the theme. Reserved for the hero and
 * the closing block; the header keeps the quiet version.
 */
export function SpecialEnterButton() {
  return (
    <SpecularButton
      href={ENTER_HREF}
      size="md"
      radius={8}
      tint="var(--swc-cta-bg)"
      tintOpacity={1}
      textColor="var(--swc-cta-fg)"
      lineColor="#ffffff"
      baseColor="#6b7680"
      idleIntensity={0.3}
      className="swc-specular group"
    >
      {CTA_LABEL}
      <ArrowRightIcon aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
    </SpecularButton>
  );
}
