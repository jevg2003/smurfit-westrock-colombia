import type { Metadata } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";
import { BrandIntro } from "@/components/brand/brand-intro";
import { Providers } from "./providers";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Smart Work Core · Contexto de Colombia para decidir",
  description: "Smart Work Core lee el contexto de Colombia (dólar, contratación pública, competidores, noticias y regulación) y lo convierte en avisos para decidir.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={geist.variable} suppressHydrationWarning>
      <body>
        <BrandIntro />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
