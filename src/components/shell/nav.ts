import {
  BellRingIcon,
  DatabaseIcon,
  FileTextIcon,
  GlobeIcon,
  HistoryIcon,
  InfoIcon,
  LandmarkIcon,
  LayoutGridIcon,
  ListOrderedIcon,
  NewspaperIcon,
  RadarIcon,
  ScaleIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  StarIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react";

/** The public landing page. The app itself lives under the (app) route group. */
export const HOME_HREF = "/";
/** The radar, i.e. the app's entry point. */
export const BRAND_HREF = "/home";

export const NAV_GROUPS = [
  {
    label: "Operación",
    items: [
      { href: BRAND_HREF, label: "Radar", icon: RadarIcon },
      { href: "/senales", label: "Señales", icon: ZapIcon },
      { href: "/pestel", label: "PESTEL", icon: LayoutGridIcon },
      { href: "/alertas", label: "Alertas", icon: BellRingIcon },
      { href: "/linea-de-tiempo", label: "Línea de tiempo", icon: HistoryIcon },
      { href: "/briefing", label: "Briefing", icon: FileTextIcon },
      { href: "/seguimiento", label: "Seguimiento", icon: StarIcon },
      { href: "/asistente", label: "Asistente", icon: SparklesIcon },
    ],
  },
  {
    label: "Dimensiones",
    items: [
      { href: "/macro", label: "Macro", icon: GlobeIcon },
      { href: "/dias", label: "TRM: días y variaciones", icon: ListOrderedIcon },
      { href: "/contratacion", label: "Contratación", icon: LandmarkIcon },
      { href: "/competidores", label: "Competidores", icon: UsersIcon },
      { href: "/noticias", label: "Noticias", icon: NewspaperIcon },
      { href: "/regulacion", label: "Regulación", icon: ScaleIcon },
    ],
  },
  {
    label: "Confianza",
    items: [
      { href: "/preferencias", label: "Preferencias", icon: SlidersHorizontalIcon },
      { href: "/fuentes", label: "Fuentes", icon: DatabaseIcon },
      { href: "/acerca", label: "Acerca de", icon: InfoIcon },
    ],
  },
];

export const NAV = NAV_GROUPS.flatMap((group) => group.items);

export const isNavActive = (pathname: string, href: string) => pathname === href;

export const navTitle = (pathname: string) => NAV.find((item) => isNavActive(pathname, item.href))?.label ?? "Monitor de entorno";
