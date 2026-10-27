import { BotMessageSquareIcon, FileTextIcon, GlobeIcon, LandmarkIcon, LayersIcon, NewspaperIcon, RadarIcon, ScaleIcon, UsersIcon, type LucideIcon } from "lucide-react";
import { SwcWordmark } from "@/components/brand/swc-logo";
import { cn } from "@/lib/utils";
import { CompanyFolders } from "./company-folders";
import { RadarMockup } from "./radar-mockup";
import { Reveal } from "./reveal";
import { EnterButton, FOCUS, H2, MECATEO_URL, NOTICE } from "./shared";
import { SignalFlow } from "./signal-flow";
import { SpecialEnterButton } from "./special-enter";
import { ThemeSwitch } from "./theme-switch";

export { EnterButton, NOTICE, CTA_LABEL } from "./shared";
export { Hero } from "./hero";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* oxlint-disable-next-line next/no-html-link-for-pages -- no prefetch on the public page */}
        <a href="/" className={cn("flex items-center rounded-md text-foreground", FOCUS)}>
          <SwcWordmark title="Smart Work Core" className="h-7 w-auto" />
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

export function Problem() {
  return (
    <section aria-labelledby="ruido-titulo" className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 md:pb-24">
      <Reveal>
        <h2 id="ruido-titulo" className={H2}>
          Del ruido a un aviso con regla
        </h2>
        <p className="mt-3 mb-8 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
          El dólar, los contratos y las normas se publican en sitios distintos. Smart Work Core los reúne y deja solo lo que cambió, con la regla que lo activó.
        </p>
        <SignalFlow />
      </Reveal>
    </section>
  );
}

export function RadarExample() {
  return (
    <section aria-labelledby="radar-titulo" className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 md:pb-24">
      <Reveal>
        <h2 id="radar-titulo" className="sr-only">
          Vista de ejemplo del radar
        </h2>
        <RadarMockup />
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Datos de ejemplo.</span> Esta vista muestra cómo se ve el radar; las cifras no son reales.
        </p>
      </Reveal>
    </section>
  );
}

interface Capability {
  icon: LucideIcon;
  title: string;
  text: string;
}

interface Group {
  name: string;
  items: Capability[];
}

const GROUPS: Group[] = [
  {
    name: "Qué mira",
    items: [
      { icon: GlobeIcon, title: "Macro", text: "TRM, PIB, inflación y precio de la energía, con su variación en el tiempo." },
      { icon: LandmarkIcon, title: "Contratación pública", text: "Contratos de SECOP II por vencer y contratos nuevos de tu competencia." },
      { icon: UsersIcon, title: "Competidores", text: "Las empresas que eliges: sus contratos y lo que reportan a Supersociedades." },
      { icon: NewspaperIcon, title: "Noticias y regulación", text: "Titulares de medios colombianos y decretos que pueden afectar a tu sector." },
    ],
  },
  {
    name: "Qué te entrega",
    items: [
      { icon: RadarIcon, title: "Radar y avisos", text: "Lo que cambió y todavía no revisaste, con severidad, regla y origen." },
      { icon: LayersIcon, title: "PESTEL y decisiones", text: "Los avisos ordenados en seis factores, y el registro de lo que decidiste." },
      { icon: FileTextIcon, title: "Briefing semanal", text: "Un resumen para leer o imprimir con lo más importante de la semana." },
      { icon: BotMessageSquareIcon, title: "Asistente", text: "Responde sobre los datos que ya cargó la app. No consulta nada fuera de ellos." },
    ],
  },
];

export function Capabilities() {
  return (
    <section id="que-hace" aria-labelledby="que-hace-titulo" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pb-16 sm:px-6 md:pb-24">
      <Reveal>
        <h2 id="que-hace-titulo" className={H2}>
          Qué hace Smart Work Core
        </h2>
        <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-0">
          {GROUPS.map((group, index) => (
            <div key={group.name} className={cn("md:px-8", index === 0 ? "md:pl-0" : "md:border-l md:pr-0")}>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">{group.name}</h3>
              <ul className="m-0 flex list-none flex-col divide-y p-0">
                {group.items.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="group flex gap-4 py-4">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border text-foreground transition-colors group-hover:border-(--swc-lime-ink) group-hover:text-(--swc-lime-ink)"
                    >
                      <Icon className="size-4.5" />
                    </span>
                    <div className="flex flex-col gap-1">
                      <h4 className="text-base font-semibold">{title}</h4>
                      <p className="max-w-[52ch] text-sm leading-relaxed text-muted-foreground">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export function Companies() {
  return (
    <section aria-labelledby="empresas-titulo" className="overflow-hidden border-y bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <Reveal>
          <h2 id="empresas-titulo" className={H2}>
            Se configura para tu empresa
          </h2>
          <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
            Una guía corta te pregunta a qué se dedica la empresa y qué quiere lograr. Con eso arma su perfil: una carpeta que reúne las palabras clave, los riesgos y las oportunidades que vigila. Cada empresa tiene su carpeta, y puedes tener varias.
          </p>
          <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">El NIT es opcional. Con NIT se activan Contratación y Competidores.</p>
        </Reveal>
        <CompanyFolders />
        <p className="mt-6 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Datos de ejemplo.</span> Abre una carpeta para ver qué contiene.
        </p>
      </div>
    </section>
  );
}

const STEPS = [
  {
    title: "Fuentes públicas",
    text: "Los datos vienen de fuentes abiertas del Estado, de organismos internacionales y de medios. Cada dato conserva su origen.",
  },
  {
    title: "Reglas escritas",
    text: "Cada aviso sale de una regla clara, con umbrales que puedes ver y ajustar. No hay puntajes opacos.",
  },
  {
    title: "Aviso con enlace",
    text: "El aviso dice qué regla lo activó y enlaza a la fuente original, para que lo compruebes tú mismo.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" aria-labelledby="como-titulo" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 md:py-24">
      <Reveal>
        <h2 id="como-titulo" className={H2}>
          Cómo funciona
        </h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-0">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative flex flex-col gap-3 md:border-l md:px-6 md:first:border-l-0 md:first:pl-0">
              <span aria-hidden="true" className="font-mono text-5xl font-semibold tracking-tighter text-(--swc-lime-ink) tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-lg font-semibold">
                <span className="sr-only">Paso {index + 1}: </span>
                {step.title}
              </h3>
              <p className="max-w-[44ch] text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </Reveal>
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
  { name: "Medios colombianos", href: null, text: "Titulares del sector y de la economía." },
];

export function Sources() {
  return (
    <section id="fuentes" aria-labelledby="fuentes-titulo" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pb-16 sm:px-6 md:pb-24">
      <Reveal>
        <h2 id="fuentes-titulo" className={H2}>
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
                    className={cn("rounded-sm underline decoration-muted-foreground/50 underline-offset-4 transition-colors hover:decoration-(--swc-lime-ink)", FOCUS)}
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
      </Reveal>
    </section>
  );
}

export function Independence() {
  return (
    <section aria-labelledby="independiente-titulo" className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 md:pb-24">
      <Reveal className="flex flex-col gap-5 rounded-2xl border bg-card/60 p-6 md:p-8">
        <div className="flex items-start gap-3">
          <ScaleIcon aria-hidden="true" className="mt-1 size-5 shrink-0 text-muted-foreground" />
          <div className="flex flex-col gap-2">
            <h2 id="independiente-titulo" className="text-2xl font-semibold tracking-tight">
              Independiente de las fuentes
            </h2>
            <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
              Smart Work Core usa datos públicos de fuentes oficiales colombianas. No es una fuente oficial ni cuenta con el aval de las entidades que los publican.
            </p>
            <p className="text-base font-semibold">{NOTICE}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <SpecialEnterButton />
          <span className="text-sm text-muted-foreground">El acceso es solo para correos autorizados.</span>
        </div>
      </Reveal>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 text-sm text-muted-foreground sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-foreground">
            <SwcWordmark title="Smart Work Core" className="h-6 w-auto" />
            <a
              href={MECATEO_URL}
              target="_blank"
              rel="noopener"
              className={cn("rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground", FOCUS)}
            >
              by mecateo<span className="text-(--swc-lime-ink)">.co</span>
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </a>
          </div>
          <ThemeSwitch />
        </div>
        <p>{NOTICE}</p>
        <p>Los datos pueden tardar o fallar; revisa siempre la fuente original.</p>
      </div>
    </footer>
  );
}

