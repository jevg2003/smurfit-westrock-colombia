import type { Metadata } from "next";
import { LandingPage } from "@/features/landing/landing-page";

// Public page behind the Cloudflare bypass: it must stay fully static (no cookies, headers or data fetching).
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Monitor de entorno del sector empaques en Colombia",
  description:
    "Prototipo independiente y no oficial que vigila el dólar, la contratación pública, los competidores y la regulación del sector empaques en Colombia.",
};

export default function Page() {
  return <LandingPage />;
}
