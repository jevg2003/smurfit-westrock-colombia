import { Capabilities, Companies, Hero, HowItWorks, Independence, LandingFooter, LandingHeader, Problem, RadarExample, Sources } from "./sections";

/** Public, static landing. The theme comes from the root ThemeProvider (dark by default); it reads no data. */
export function LandingPage() {
  return (
    <div className="swc-landing min-h-dvh bg-background text-foreground">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-background"
      >
        Saltar al contenido
      </a>
      <LandingHeader />
      <main id="contenido">
        <Hero />
        <Problem />
        <RadarExample />
        <Capabilities />
        <Companies />
        <HowItWorks />
        <Sources />
        <Independence />
      </main>
      <LandingFooter />
    </div>
  );
}
