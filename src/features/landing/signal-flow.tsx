"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { SwcSymbol } from "@/components/brand/swc-logo";
import LatticeLoader from "@/components/react-bits/LatticeLoader/LatticeLoader";
import { Badge } from "@/components/reui/badge";
import { DimensionBadge, SeverityBadge } from "@/features/avisos/badges";
import { SAMPLE_ALERTS } from "./sample-data";

const REDUCED = "(prefers-reduced-motion: reduce)";

type Point = readonly [number, number];

interface Source {
  label: string;
  /** Position in the wide stage (viewBox 160 x 110) and in the narrow one (100 x 110). */
  wide: Point;
  narrow: Point;
  /** Fixed offsets so the "noise" start state is identical on every load. */
  jitter: readonly [number, number, number];
}

const SOURCES: Source[] = [
  { label: "TRM", wide: [16, 16], narrow: [22, 8], jitter: [-26, -18, -8] },
  { label: "SECOP II", wide: [52, 12], narrow: [70, 12], jitter: [22, -24, 7] },
  { label: "Supersociedades", wide: [24, 40], narrow: [32, 27], jitter: [-30, 14, 5] },
  { label: "Noticias", wide: [74, 34], narrow: [80, 33], jitter: [28, 20, -9] },
  { label: "Decretos", wide: [14, 66], narrow: [20, 46], jitter: [-18, 28, 9] },
  { label: "Exportaciones", wide: [58, 62], narrow: [66, 52], jitter: [24, -22, -6] },
  { label: "Energía (XM)", wide: [38, 92], narrow: [44, 68], jitter: [-14, 26, 8] },
];

const WIDE = { w: 160, h: 110, core: [138, 55] as Point };
const NARROW = { w: 100, h: 110, core: [50, 92] as Point };

const RULES: Record<string, string> = {
  a1: "variación diaria de la TRM mayor que el umbral",
  a2: "contrato por vencer dentro de la ventana definida",
  a3: "contrato nuevo de un competidor en seguimiento",
};

function curve([x, y]: Point, [cx, cy]: Point, vertical: boolean) {
  if (vertical) {
    const my = (y + cy) / 2;
    return `M${x} ${y} C${x} ${my} ${cx} ${my} ${cx} ${cy}`;
  }
  const mx = (x + cx) / 2;
  return `M${x} ${y} C${mx} ${y} ${mx} ${cy} ${cx} ${cy}`;
}

const pct = (value: number, total: number) => `${((value / total) * 100).toFixed(2)}%`;
const vars = (values: Record<string, string | number>) => values as CSSProperties;

function Lines({ stage, vertical }: { stage: typeof WIDE; vertical: boolean }) {
  const key = vertical ? "narrow" : "wide";
  return (
    <svg viewBox={`0 0 ${stage.w} ${stage.h}`} aria-hidden="true" className="absolute inset-0 size-full text-foreground">
      {SOURCES.map((source, i) => (
        <path key={source.label} data-i={i} className="flow-line" pathLength={1} strokeWidth={0.35} style={vars({ "--d": `${i * 0.12}s` })} d={curve(source[key], stage.core, vertical)} />
      ))}
      <path
        className="flow-line flow-out"
        pathLength={1}
        strokeWidth={0.6}
        strokeLinecap="round"
        d={vertical ? `M${stage.core[0]} ${stage.core[1]} V${stage.h}` : `M${stage.core[0]} ${stage.core[1]} H${stage.w}`}
      />
    </svg>
  );
}

function Core({ stage, className }: { stage: typeof WIDE; className: string }) {
  return (
    <div aria-hidden="true" className={className} style={vars({ left: pct(stage.core[0], stage.w), top: pct(stage.core[1], stage.h) })}>
      <span className="flow-pulse absolute inset-0 rounded-full border-2 border-(--swc-lime)" />
      <SwcSymbol className="relative size-14 rounded-full bg-background text-foreground" />
    </div>
  );
}

/**
 * Public sources scattered on one side, converging into the SWC core, coming out as a short list
 * of written signals. A lattice loader names the steps as they happen (reading sources, applying
 * the written rules); the rules, not a model, create the signals. It plays once, when it enters the viewport. Without JavaScript or under
 * reduced motion it renders directly in its final state. The chips and the list carry the content;
 * the lines are decoration.
 */
export function SignalFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "armed" | "played">("idle");
  const [step, setStep] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    if (typeof window.matchMedia === "function" && window.matchMedia(REDUCED).matches) return;
    setState("armed");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setState("played");
        observer.disconnect();
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // The loader narrates the real order of the pipeline while the animation plays: sources are read,
  // then the written rules run, then the signals appear. Idle and reduced motion stay on "done".
  useEffect(() => {
    if (state !== "played") return;
    const rules = setTimeout(() => setStep(1), 1200);
    const done = setTimeout(() => setStep(2), 2300);
    return () => {
      clearTimeout(rules);
      clearTimeout(done);
    };
  }, [state]);

  const phase = state !== "played" || step === 2 ? "done" : step === 1 ? "rules" : "reading";
  const corePos = "absolute grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center";

  return (
    <div ref={ref} data-state={state} className="swc-flow grid gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:items-center">
      <div className="relative aspect-[100/110] w-full md:aspect-[160/110]">
        <div className="absolute inset-0 md:hidden">
          <Lines stage={NARROW} vertical />
        </div>
        <div className="absolute inset-0 hidden md:block">
          <Lines stage={WIDE} vertical={false} />
        </div>
        <ul className="m-0 list-none p-0">
          {SOURCES.map((source, i) => (
            <li
              key={source.label}
              data-i={i}
              className="flow-chip absolute -translate-x-1/2 -translate-y-1/2 rounded-full border bg-card px-3 py-1 text-xs font-medium whitespace-nowrap text-foreground shadow-xs transition-colors hover:border-(--swc-lime-ink) sm:text-sm"
              style={vars({
                "--nx": pct(source.narrow[0], NARROW.w),
                "--ny": pct(source.narrow[1], NARROW.h),
                "--wx": pct(source.wide[0], WIDE.w),
                "--wy": pct(source.wide[1], WIDE.h),
                "--d": `${i * 0.12}s`,
                "--jx": `${source.jitter[0]}px`,
                "--jy": `${source.jitter[1]}px`,
                "--jr": `${source.jitter[2]}deg`,
              })}
            >
              {source.label}
            </li>
          ))}
        </ul>
        <Core stage={NARROW} className={`${corePos} md:hidden`} />
        <Core stage={WIDE} className={`${corePos} hidden md:grid`} />
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-base font-semibold">Lo que sale</h3>
          <Badge variant="outline" size="sm">
            Ejemplo
          </Badge>
        </div>
        <div className="mb-3 text-muted-foreground">
          <LatticeLoader
            label={phase === "reading" ? "Leyendo fuentes" : "Aplicando reglas"}
            doneLabel="Reglas aplicadas"
            status={phase === "done" ? "done" : "working"}
            pattern="orbit"
            cellSize={5}
            gap={2}
            fontSize={13}
            showTimer={false}
            doneColor="var(--swc-lime-ink)"
            className="swc-loader"
          />
        </div>
        <ol className="m-0 flex list-none flex-col divide-y rounded-xl border bg-card/60 p-0">
          {SAMPLE_ALERTS.map((alert, i) => (
            <li key={alert.id} className="flow-signal flex flex-col gap-1.5 px-4 py-3" style={vars({ "--i": i })}>
              <div className="flex flex-wrap items-center gap-1.5">
                <DimensionBadge dimension={alert.dimension} />
                <SeverityBadge severity={alert.severity} />
              </div>
              <span className="text-sm font-medium">{alert.title}</span>
              <span className="text-xs text-muted-foreground">
                Regla: {RULES[alert.id]} · Fuente: {alert.origin}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
