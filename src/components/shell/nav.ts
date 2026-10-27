import { BarChart3Icon, LayoutGridIcon, NewspaperIcon, RadarIcon, SettingsIcon, SparklesIcon } from "lucide-react";

/** The public landing page. The app itself lives under the (app) route group. */
export const HOME_HREF = "/";
/** The first page of the app. */
export const BRAND_HREF = "/resumen";

export const NAV = [
  { href: BRAND_HREF, label: "Resumen", icon: RadarIcon },
  { href: "/economia", label: "Economía", icon: BarChart3Icon },
  { href: "/noticias", label: "Noticias", icon: NewspaperIcon },
  { href: "/analisis", label: "Análisis", icon: LayoutGridIcon },
  { href: "/asistente", label: "Asistente", icon: SparklesIcon },
];

/** Lives in the sidebar footer, next to the company switcher. */
export const CONFIG_ITEM = { href: "/configuracion", label: "Configuración", icon: SettingsIcon };

export const isNavActive = (pathname: string, href: string) => pathname === href;

export const navTitle = (pathname: string) => [...NAV, CONFIG_ITEM].find((item) => isNavActive(pathname, item.href))?.label ?? "Smart Work Core";
