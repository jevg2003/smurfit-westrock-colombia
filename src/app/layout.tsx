import type { Metadata } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { PeriodoProvider, PeriodoSelect } from "@/features/trm/periodo";
import { Providers } from "./providers";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Smurfit Westrock Colombia · Monitor de entorno",
  description: "Prototipo no oficial: monitor de la TRM (COP/USD) con variaciones atípicas y alertas.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={geist.variable} suppressHydrationWarning>
      <body>
        <Providers>
          <PeriodoProvider>
            <AppShell actions={<PeriodoSelect />}>{children}</AppShell>
          </PeriodoProvider>
        </Providers>
      </body>
    </html>
  );
}
