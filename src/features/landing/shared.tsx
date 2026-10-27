import { ArrowRightIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "./landing.css";

export const NOTICE = "Herramienta independiente: usa datos públicos y no reemplaza asesoría financiera, legal ni de compras.";
export const CTA_LABEL = "Entrar a Smart Work Core";
/** Where the call to action goes: the app, behind its own login. */
export const ENTER_HREF = "/resumen";
export const MECATEO_URL = "https://mecateo.co";

/** Lime ring on both themes; the dark-theme lime and the light-theme olive both clear 3:1 against the page. */
export const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--swc-lime-ink)";

/** Section titles share one scale so the page keeps a single rhythm. */
export const H2 = "max-w-2xl text-3xl font-semibold tracking-tight text-balance md:text-4xl";

/** Ink button on light, lime button on dark. Both pass AA for the label. */
const ctaClass = cn(
  buttonVariants({ size: "lg" }),
  "group h-11 gap-2 rounded-lg bg-(--swc-ink) px-5 text-base font-semibold text-white transition-colors hover:bg-(--swc-ink)/85",
  "dark:bg-(--swc-lime) dark:text-(--swc-ink) dark:hover:bg-(--swc-lime)/85",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--swc-lime-ink)",
);

/** A plain anchor, not next/link: `/home` is private and a prefetch would hit it before the login. */
export function EnterButton({ className }: { className?: string }) {
  return (
    // oxlint-disable-next-line next/no-html-link-for-pages -- deliberate full navigation, see above
    <a href={ENTER_HREF} className={cn(ctaClass, className)}>
      {CTA_LABEL}
      <ArrowRightIcon aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
    </a>
  );
}
