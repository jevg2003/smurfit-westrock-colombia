import type { CSSProperties } from "react";
import { SwcWordmark } from "@/components/brand/swc-logo";
import { cn } from "@/lib/utils";
import { FOCUS } from "./shared";
import { SpecialEnterButton } from "./special-enter";

const CORE = { x: 246, y: 50 };
const RINGS = [40, 64, 92];

const vars = (values: Record<string, string>) => values as CSSProperties;

/**
 * The shared SWC wordmark with a draw-on animation driven from CSS (`.swc-hero-mark`, see
 * landing.css): the strokes grow from the core dot, then the rings spread. The rings live in a
 * second decorative SVG with the same viewBox, so they can extend past the wordmark's box. The
 * final state is the plain logo, which is also what reduced motion shows.
 */
function HeroMark({ className }: { className?: string }) {
  return (
    <div className={cn("relative w-[86%]", className)}>
      <svg viewBox="0 0 296 100" fill="none" aria-hidden="true" className="swc-hero-rings absolute inset-0 size-full overflow-visible">
        {RINGS.map((r, i) => (
          <circle key={r} className="ring" cx={CORE.x} cy={CORE.y} r={r} style={vars({ "--d": `${1.7 + i * 0.25}s` })} />
        ))}
      </svg>
      <SwcWordmark title="Smart Work Core" className="swc-hero-mark relative h-auto w-full overflow-visible" />
    </div>
  );
}

export function Hero() {
  return (
    <section aria-labelledby="titulo" className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="landing-grid pointer-events-none absolute inset-0 -z-10" />
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pt-10 pb-14 sm:px-6 md:pt-16 lg:grid-cols-12 lg:gap-6 lg:pb-20">
        <div className="order-2 flex flex-col items-start gap-6 lg:order-1 lg:col-span-7">
          <h1 id="titulo" className="landing-rise max-w-2xl text-4xl leading-[1.05] font-semibold tracking-tighter text-balance md:text-5xl lg:text-6xl">
            Lee el contexto de Colombia antes de decidir
          </h1>
          <p className="landing-rise max-w-[52ch] text-base leading-relaxed text-muted-foreground [animation-delay:80ms] md:text-lg">
            Dólar, contratos públicos, competidores, noticias y regulación, convertidos en avisos con una regla que puedes leer.
          </p>
          <div className="landing-rise flex flex-wrap items-center gap-x-6 gap-y-3 [animation-delay:160ms]">
            <SpecialEnterButton />
            <a
              href="#como-funciona"
              className={cn("rounded-md text-base text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline", FOCUS)}
            >
              Cómo funciona
            </a>
          </div>
        </div>
        <div className="order-1 mx-auto w-full max-w-xs lg:order-2 lg:col-span-5 lg:max-w-none">
          <HeroMark className="text-foreground" />
        </div>
      </div>
    </section>
  );
}
