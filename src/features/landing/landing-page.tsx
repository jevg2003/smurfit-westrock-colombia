import { FeatureGrid, Hero, HowItWorks, LandingFooter, LandingHeader, PilotNotice, RadarExample, Sources, TopNotice } from "./sections";

/** Public, static landing. The theme comes from the root ThemeProvider (dark by default); it reads no data. */
export function LandingPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-background"
      >
        Saltar al contenido
      </a>
      <TopNotice />
      <LandingHeader />
      <main id="contenido">
        <Hero />
        <RadarExample />
        <FeatureGrid />
        <HowItWorks />
        <Sources />
        <PilotNotice />
      </main>
      <LandingFooter />
    </div>
  );
}
