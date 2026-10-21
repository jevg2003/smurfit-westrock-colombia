import type { SourceId } from "@/core/domain/provenance";

export interface SourceInfo {
  name: string;
  attribution: string;
  license: string;
}

export const SECOP_ATTRIBUTION = "Agencia Nacional de Contratación Pública - Colombia Compra Eficiente vía datos.gov.co";

/** Display names, attribution and licenses of the sources used by the screens. */
export const SOURCES = {
  trm: {
    name: "TRM",
    attribution: "Superintendencia Financiera de Colombia vía datos.gov.co",
    license: "CC BY-SA 4.0",
  },
  secop: { name: "SECOP II", attribution: SECOP_ATTRIBUTION, license: "CC BY-SA 4.0" },
  worldBank: { name: "Banco Mundial", attribution: "Banco Mundial – World Development Indicators", license: "CC BY 4.0" },
  exports: {
    name: "Exportaciones",
    attribution: "Ministerio de Comercio, Industria y Turismo - MinCIT vía datos.gov.co",
    license: "CC BY-SA 4.0",
  },
  supersociedades: {
    name: "Supersociedades",
    attribution: "Superintendencia de Sociedades vía datos.gov.co",
    license: "CC BY-SA 4.0",
  },
} satisfies Record<string, SourceInfo>;

export const SOURCE_NAMES: Record<SourceId, string> = {
  trm: "TRM (datos.gov.co)",
  secop: "SECOP II (datos.gov.co)",
  supersociedades: "Supersociedades",
  "world-bank": "Banco Mundial",
  exports: "Exportaciones (datos.gov.co)",
  "news-rss": "Medios (RSS)",
  "google-news": "Google News",
  minambiente: "Minambiente",
  presidencia: "Presidencia",
  curated: "Curado manualmente",
};
