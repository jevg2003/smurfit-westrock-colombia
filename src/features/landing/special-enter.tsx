"use client";

import { ArrowRightIcon } from "lucide-react";
import { markIntroFromLanding } from "@/components/brand/intro-policy";
import SpecularButton from "@/components/react-bits/SpecularButton/SpecularButton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CTA_LABEL, ENTER_HREF } from "./shared";

/** Ink button on light, lime button on dark. Both pass AA for the label. */
const ctaClass = cn(
  buttonVariants({ size: "lg" }),
  "group h-11 gap-2 rounded-lg bg-(--swc-ink) px-5 text-base font-semibold text-white transition-colors hover:bg-(--swc-ink)/85",
  "dark:bg-(--swc-lime) dark:text-(--swc-ink) dark:hover:bg-(--swc-lime)/85",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--swc-lime-ink)",
);

/**
 * A plain anchor, not next/link: the app is private and a prefetch would hit it before the login.
 * Every way into the app from the landing plays the logo intro on arrival.
 */
export function EnterButton({ className }: { className?: string }) {
  return (
    // oxlint-disable-next-line next/no-html-link-for-pages -- deliberate full navigation, see above
    <a href={ENTER_HREF} onClick={markIntroFromLanding} className={cn(ctaClass, className)}>
      {CTA_LABEL}
      <ArrowRightIcon aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
    </a>
  );
}

/**
 * The same call to action as `EnterButton`, with a light that follows the pointer along the edge.
 * Colors come from the landing tokens, so the button flips from ink to lime with the theme.
 * Reserved for the hero and the closing block; the header keeps the quiet version.
 */
export function SpecialEnterButton() {
  return (
    <SpecularButton
      href={ENTER_HREF}
      onClick={markIntroFromLanding}
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
