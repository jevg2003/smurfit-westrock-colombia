import type { Metadata } from "next";
import { LandingPage } from "@/features/landing/landing-page";

// Public page behind the Cloudflare bypass: it must stay fully static (no cookies, headers or data fetching).
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Smart Work Core · Contexto de Colombia para decidir",
  description:
    "Herramienta independiente que lee el dólar, la contratación pública, los competidores, las noticias y la regulación de Colombia para que una empresa decida con datos.",
};

export default function Page() {
  return <LandingPage />;
}
