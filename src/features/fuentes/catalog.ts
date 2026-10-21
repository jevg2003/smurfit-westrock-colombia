import { MINAMBIENTE_FEED, NEWS_FEEDS } from "@/infrastructure/sources/rss/feeds";

export type AccessMethod = "browser" | "server";

export interface SourceCatalogEntry {
  id: string;
  name: string;
  organization: string;
  url: string;
  license: string;
  attribution: string;
  access: AccessMethod;
  /** How often the origin publishes new data, in plain Spanish. */
  frequency: string;
  /** Name of the server flag that can switch the source off, when there is one. */
  flag?: "newsRss" | "googleNews" | "minambiente" | "presidencia" | "xm";
}

const DATOS = "datos.gov.co";
const CC_SA = "CC BY-SA 4.0";

export const ACCESS_LABELS: Record<AccessMethod, string> = {
  browser: "Navegador",
  server: "Proxy del servidor",
};

/** Static facts about every source. Live health is added from the cached queries. */
export const CATALOG = {
  trm: {
    id: "trm",
    name: "TRM",
    organization: "Superintendencia Financiera de Colombia",
    url: "https://www.datos.gov.co/resource/mcec-87by.json",
    license: CC_SA,
    attribution: `Superintendencia Financiera de Colombia vía ${DATOS}`,
    access: "browser",
    frequency: "Diaria (días hábiles)",
  },
  secop: {
    id: "secop",
    name: "SECOP II",
    organization: "Agencia Nacional de Contratación Pública - Colombia Compra Eficiente",
    url: "https://www.datos.gov.co/resource/jbjy-vk9h.json",
    license: CC_SA,
    attribution: `Colombia Compra Eficiente vía ${DATOS}`,
    access: "browser",
    frequency: "Diaria",
  },
  pib: {
    id: "pib",
    name: "Banco Mundial: PIB",
    organization: "Banco Mundial",
    url: "https://api.worldbank.org/v2/country/COL/indicator/NY.GDP.MKTP.KD.ZG",
    license: "CC BY 4.0",
    attribution: "Banco Mundial – World Development Indicators",
    access: "browser",
    frequency: "Anual",
  },
  ipc: {
    id: "ipc",
    name: "Banco Mundial: inflación (IPC)",
    organization: "Banco Mundial",
    url: "https://api.worldbank.org/v2/country/COL/indicator/FP.CPI.TOTL.ZG",
    license: "CC BY 4.0",
    attribution: "Banco Mundial – World Development Indicators",
    access: "browser",
    frequency: "Anual",
  },
  exports: {
    id: "exports",
    name: "Exportaciones",
    organization: "Ministerio de Comercio, Industria y Turismo (MinCIT)",
    url: "https://www.datos.gov.co/resource/vwqt-xc3z.json",
    license: CC_SA,
    attribution: `MinCIT vía ${DATOS}`,
    access: "browser",
    frequency: "Trimestral",
  },
  supersociedades: {
    id: "supersociedades",
    name: "Supersociedades",
    organization: "Superintendencia de Sociedades",
    url: "https://www.datos.gov.co/resource/6cat-2gcs.json",
    license: CC_SA,
    attribution: `Superintendencia de Sociedades vía ${DATOS}`,
    access: "browser",
    frequency: "Anual",
  },
  googleNews: {
    id: "google-news",
    name: "Google News",
    organization: "Google",
    url: "https://news.google.com/",
    license: "Uso personal y no comercial (riesgo aceptado)",
    attribution: "Google News (solo titular, medio, fecha y enlace)",
    access: "server",
    frequency: "Continua",
    flag: "googleNews",
  },
  minambiente: {
    id: "minambiente",
    name: "Minambiente",
    organization: MINAMBIENTE_FEED.outlet,
    url: "https://www.minambiente.gov.co/",
    license: "Solo titular, fecha y enlace (derechos del Ministerio)",
    attribution: MINAMBIENTE_FEED.outlet,
    access: "server",
    frequency: "Varias veces por semana",
    flag: "minambiente",
  },
  presidencia: {
    id: "presidencia",
    name: "Decretos de Presidencia",
    organization: "Departamento Administrativo de la Presidencia de la República (DAPRE)",
    url: "https://www.datos.gov.co/resource/88h2-dykw.json",
    license: CC_SA,
    attribution: `DAPRE vía ${DATOS}`,
    access: "server",
    frequency: "Cuando se expide un decreto",
    flag: "presidencia",
  },
  curated: {
    id: "curated",
    name: "Normas curadas",
    organization: "Equipo del prototipo",
    url: "/regulacion",
    license: "Texto propio con enlace a la norma original",
    attribution: "Curado a mano a partir de fuentes oficiales",
    access: "browser",
    frequency: "Manual",
  },
  xm: {
    id: "xm",
    name: "XM: energía eléctrica",
    organization: "XM S.A. E.S.P.",
    url: "https://servapibi.xm.com.co/hourly",
    license: "Datos públicos de XM (sin licencia abierta declarada)",
    attribution: "XM S.A. E.S.P.",
    access: "server",
    frequency: "Diaria",
    flag: "xm",
  },
  ai: {
    id: "ai",
    name: "Asistente de IA",
    organization: "Proveedor de IA configurado en el servidor",
    url: "/asistente",
    license: "Según el proveedor; la respuesta no es una fuente oficial",
    attribution: "Modelo de lenguaje; cita las fuentes que usa",
    access: "server",
    frequency: "Bajo demanda",
  },
  access: {
    id: "access",
    name: "Cloudflare Access",
    organization: "Cloudflare",
    url: "https://developers.cloudflare.com/cloudflare-one/policies/access/",
    license: "No aplica: protege el acceso a la app, no entrega datos",
    attribution: "Inicio de sesión con código de un solo uso",
    access: "server",
    frequency: "En cada visita",
  },
} as const satisfies Record<string, SourceCatalogEntry>;

/** One entry per media RSS feed, from the same closed list the server proxy uses. */
export const FEED_CATALOG: readonly SourceCatalogEntry[] = NEWS_FEEDS.map((feed) => ({
  id: feed.id,
  name: feed.outlet,
  organization: feed.outlet,
  url: feed.url,
  license: "Solo titular, medio, fecha y enlace",
  attribution: feed.outlet,
  access: "server",
  frequency: "Continua",
  flag: "newsRss",
}));
