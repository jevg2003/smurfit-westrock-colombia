import {
  ArrowRightIcon,
  BellRingIcon,
  BotMessageSquareIcon,
  BuildingIcon,
  FileTextIcon,
  GlobeIcon,
  LandmarkIcon,
  LayersIcon,
  NewspaperIcon,
  RadarIcon,
  ScaleIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RadarMockup } from "./radar-mockup";
import { ThemeSwitch } from "./theme-switch";

export const NOTICE = "Herramienta independiente: usa datos públicos y no reemplaza asesoría financiera, legal ni de compras.";
export const CTA_LABEL = "Entrar a Smart Work Core";

const FOCUS = "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

const ctaClass = cn(
  buttonVariants({ size: "lg" }),
  "h-11 gap-2 bg-foreground px-5 text-base font-semibold text-background hover:bg-foreground/85",
);

/** A plain anchor, not next/link: `/resumen` is private and a prefetch would hit it before the login. */
export function EnterButton({ className }: { className?: string }) {
  return (
    // oxlint-disable-next-line next/no-html-link-for-pages -- deliberate full navigation, see above
    <a href="/resumen" className={cn(ctaClass, className)}>
      {CTA_LABEL}
      <ArrowRightIcon aria-hidden="true" />
    </a>
  );
}

export function TopNotice() {
  return (
    <div className="border-b bg-warning/10 px-4 py-2 text-center text-xs text-warning-foreground sm:text-sm">
      <p className="mx-auto flex max-w-6xl items-center justify-center gap-2">
        <TriangleAlertIcon aria-hidden="true" className="size-4 shrink-0" />
        <span>{NOTICE}</span>
      </p>
    </div>
  );
}

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* oxlint-disable-next-line next/no-html-link-for-pages -- no prefetch on the public page */}
        <a href="/" className={cn("flex items-center gap-2 rounded-md font-semibold tracking-tight", FOCUS)}>
          <span aria-hidden="true" className="grid size-7 place-items-center rounded-md bg-primary/15 text-primary">
            <RadarIcon className="size-4" />
          </span>
          Smart Work Core
        </a>
        <nav aria-label="Secciones" className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a className={cn("rounded-sm transition-colors hover:text-foreground", FOCUS)} href="#que-hace">
            Qué hace
          </a>
          <a className={cn("rounded-sm transition-colors hover:text-foreground", FOCUS)} href="#como-funciona">
            Cómo funciona
          </a>
          <a className={cn("rounded-sm transition-colors hover:text-foreground", FOCUS)} href="#fuentes">
            Fuentes
          </a>
        </nav>
        <EnterButton className="h-9 px-3 text-sm" />
      </div>
    </header>
  );
}

export function Hero() {
  return (
    <section aria-labelledby="titulo" className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="landing-grid pointer-events-none absolute inset-0 -z-10" />
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 pt-16 pb-10 sm:px-6 md:pt-24 md:pb-14">
        <h1 id="titulo" className="landing-rise max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tighter text-balance md:text-5xl lg:text-6xl">
          Lee el contexto de Colombia antes de decidir
        </h1>
        <p className="landing-rise max-w-[60ch] text-base leading-relaxed text-muted-foreground [animation-delay:80ms] md:text-lg">
          Dólar, contratación pública, competidores, noticias y regulación de tu empresa en un solo lugar, con datos abiertos y reglas que puedes revisar.
        </p>
        <div className="landing-rise flex flex-wrap items-center gap-x-5 gap-y-3 [animation-delay:160ms]">
          <EnterButton />
          <a
            href="#como-funciona"
            className={cn("rounded-md text-base text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline", FOCUS)}
          >
            Cómo funciona
          </a>
        </div>
        <p className="landing-rise text-sm text-muted-foreground [animation-delay:200ms]">El acceso es solo para correos autorizados.</p>
      </div>
    </section>
  );
}

export function RadarExample() {
  return (
    <section aria-labelledby="radar-titulo" className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 md:pb-24">
      <h2 id="radar-titulo" className="sr-only">
        Vista de ejemplo del radar
      </h2>
      <RadarMockup />
      <p className="mt-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Datos de ejemplo.</span> Esta vista muestra cómo se ve el radar; las cifras no son reales.
      </p>
    </section>
  );
}

interface Feature {
  icon: LucideIcon;
  title: string;
  text: string;
  span: string;
  extra?: ReactNode;
  tint?: boolean;
}

const MACRO_CHIPS = ["TRM", "PIB", "IPC", "Energía"];

const FEATURES: Feature[] = [
  {
    icon: RadarIcon,
    title: "Radar de señales",
    text: "Reúne lo que cambió en el entorno y todavía no has revisado, con su severidad y su origen.",
    span: "lg:col-span-4",
    tint: true,
  },
  {
    icon: LandmarkIcon,
    title: "Contratación pública (SECOP)",
    text: "Contratos públicos por vencer y contratos nuevos de la competencia, tomados de SECOP II.",
    span: "lg:col-span-2",
  },
  {
    icon: GlobeIcon,
    title: "Macro (TRM, PIB, IPC, energía)",
    text: "Indicadores del país con su variación en el tiempo.",
    span: "lg:col-span-2",
    extra: (
      <ul className="mt-auto flex flex-wrap gap-1.5 pt-2">
        {MACRO_CHIPS.map((chip) => (
          <li key={chip} className="rounded-md border bg-background/60 px-2 py-0.5 font-mono text-xs text-muted-foreground">
            {chip}
          </li>
        ))}
      </ul>
    ),
  },
  {
    icon: BuildingIcon,
    title: "Competidores",
    text: "Sigue a las empresas que eliges: sus contratos públicos y lo que reportan a Supersociedades.",
    span: "lg:col-span-2",
  },
  {
    icon: NewspaperIcon,
    title: "Noticias y regulación",
    text: "Noticias de medios colombianos y decretos que pueden afectar al sector.",
    span: "lg:col-span-2",
  },
  {
    icon: LayersIcon,
    title: "PESTEL y decisiones",
    text: "Ordena las señales en seis factores y deja registro de lo que decides.",
    span: "lg:col-span-2",
  },
  {
    icon: FileTextIcon,
    title: "Briefing semanal",
    text: "Un resumen listo para leer o imprimir con lo más importante de la semana.",
    span: "lg:col-span-2",
  },
  {
    icon: BotMessageSquareIcon,
    title: "Asistente de IA",
    text: "Haz preguntas sobre los datos que ves en pantalla y recibe respuestas en lenguaje sencillo.",
    span: "lg:col-span-2",
  },
];

export function FeatureGrid() {
  return (
    <section id="que-hace" aria-labelledby="que-hace-titulo" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pb-16 sm:px-6 md:pb-24">
      <h2 id="que-hace-titulo" className="max-w-2xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">
        Qué hace Smart Work Core
      </h2>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {FEATURES.map(({ icon: Icon, title, text, span, extra, tint }) => (
          <li
            key={title}
            className={cn(
              "flex min-w-0 flex-col gap-3 rounded-xl border p-5 transition-colors hover:border-foreground/25",
              tint ? "bg-linear-to-br from-primary/15 via-card to-card" : "bg-card/50",
              span,
            )}
          >
            <span aria-hidden="true" className="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary">
              <Icon className="size-5" />
            </span>
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="max-w-[60ch] text-sm leading-relaxed text-muted-foreground">{text}</p>
            {extra}
          </li>
        ))}
      </ul>
    </section>
  );
}

const STEPS = [
  {
    title: "Fuentes públicas verificables",
    text: "Los datos vienen de fuentes abiertas del Estado, de organismos internacionales y de medios. Cada dato conserva su origen.",
  },
  {
    title: "Reglas escritas y visibles",
    text: "Las alertas salen de reglas claras, con umbrales que puedes ver y ajustar. No hay puntajes opacos.",
  },
  {
    title: "Alertas con origen y enlace",
    text: "Cada alerta dice qué regla la activó y enlaza a la fuente original, para que la compruebes tú mismo.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" aria-labelledby="como-titulo" className="scroll-mt-20 border-y bg-card/30">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <h2 id="como-titulo" className="max-w-2xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          Cómo funciona
        </h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-0">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative flex flex-col gap-3 md:border-l md:px-6 md:first:border-l-0 md:first:pl-0">
              <span aria-hidden="true" className="font-mono text-5xl font-semibold tracking-tighter text-primary/70 tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-lg font-semibold">
                <span className="sr-only">Paso {index + 1}: </span>
                {step.title}
              </h3>
              <p className="max-w-[60ch] text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const SOURCES = [
  {
    name: "datos.gov.co",
    href: "https://www.datos.gov.co",
    text: "Portal de datos abiertos. De aquí salen la TRM (Superfinanciera), los contratos (Colombia Compra Eficiente), los reportes de empresas (Supersociedades) y las exportaciones (MinCIT).",
  },
  { name: "Banco Mundial", href: "https://data.worldbank.org", text: "Indicadores macroeconómicos como el PIB y la inflación." },
  { name: "XM", href: "https://www.xm.com.co", text: "Precio de bolsa de la energía en Colombia." },
  { name: "Medios colombianos", href: null, text: "Noticias del sector y de la economía." },
];

export function Sources() {
  return (
    <section id="fuentes" aria-labelledby="fuentes-titulo" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 md:py-24">
      <h2 id="fuentes-titulo" className="max-w-2xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">
        Fuentes y licencias
      </h2>
      <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
        Cada fuente tiene sus propias condiciones de uso. Revísalas en el sitio de cada una antes de reutilizar sus datos.
      </p>
      <ul className="mt-8 grid divide-y border-y md:grid-cols-2 md:divide-y-0">
        {SOURCES.map((source) => (
          <li key={source.name} className="flex flex-col gap-1 py-5 md:border-b md:odd:pr-8 md:even:border-l md:even:pl-8 md:nth-last-[-n+2]:border-b-0">
            <h3 className="text-base font-semibold">
              {source.href ? (
                <a
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn("rounded-sm underline decoration-muted-foreground/50 underline-offset-4 transition-colors hover:text-primary", FOCUS)}
                >
                  {source.name}
                  <span className="sr-only"> (se abre en otra pestaña)</span>
                </a>
              ) : (
                source.name
              )}
            </h3>
            <p className="max-w-[60ch] text-sm leading-relaxed text-muted-foreground">{source.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PilotNotice() {
  return (
    <section aria-labelledby="piloto-titulo" className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 md:pb-24">
      <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-warning/30 bg-warning/5 p-6 md:p-8">
        <div className="flex items-start gap-3">
          <ScaleIcon aria-hidden="true" className="mt-1 size-5 shrink-0 text-warning-foreground" />
          <div className="flex flex-col gap-2">
            <h2 id="piloto-titulo" className="text-2xl font-semibold tracking-tight">
              Una herramienta independiente
            </h2>
            <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
              Smart Work Core usa datos públicos de fuentes oficiales colombianas, pero no es una fuente oficial ni cuenta con el aval de esas entidades.
            </p>
            <p className="text-base font-semibold">{NOTICE}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <EnterButton />
          <span className="text-sm text-muted-foreground">El acceso es solo para correos autorizados.</span>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <p className="flex items-start gap-2">
            <BellRingIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>Los datos pueden tardar o fallar; revisa siempre la fuente original.</span>
          </p>
          <ThemeSwitch />
        </div>
        <p>{NOTICE}</p>
      </div>
    </footer>
  );
}
