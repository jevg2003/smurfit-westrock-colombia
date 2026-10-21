import type { FeedHealth } from "@/infrastructure/sources/rss/service";
import type { RegulationFeedData } from "@/infrastructure/sources/regulation/client-adapter";
import { CATALOG, FEED_CATALOG, type SourceCatalogEntry } from "./catalog";
import { fromBlock, fromFeed, withFlag, type Snapshot } from "./snapshots";
import type { FuentesStatus } from "./status-schema";

export interface FuenteRow {
  entry: SourceCatalogEntry;
  snapshot: Snapshot;
  /** State of the server flag, when the source has one. */
  flag?: boolean;
}

export interface FuenteGroup {
  id: string;
  title: string;
  rows: FuenteRow[];
}

export type StatusInput = { state: "pending" | "error" } | { state: "ok"; data: FuentesStatus };

export interface GroupInputs {
  trm: Snapshot;
  secop: Snapshot;
  pib: Snapshot;
  ipc: Snapshot;
  exports: Snapshot;
  supersociedades: Snapshot;
  xm: Snapshot;
  news: { snapshot: Snapshot; feeds: FeedHealth[]; off: boolean; fetchedAt?: number };
  regulation: { snapshot: Snapshot; data?: RegulationFeedData; fetchedAt?: number };
  curatedCount: number;
  status: StatusInput;
  /** Re-reads `/api/fuentes` (flags and AI configuration). */
  retryStatus?: () => void;
}

const noop = () => {};

export function buildGroups(input: GroupInputs): FuenteGroup[] {
  const flags = input.status.state === "ok" ? input.status.data.flags : undefined;
  const row = (entry: SourceCatalogEntry, snapshot: Snapshot): FuenteRow => {
    const flag = entry.flag ? flags?.[entry.flag] : undefined;
    return { entry, snapshot: withFlag(snapshot, flag), ...(flag !== undefined ? { flag } : {}) };
  };

  const feedRow = (entry: SourceCatalogEntry): FuenteRow => {
    const { snapshot: view, feeds, off, fetchedAt } = input.news;
    if (off) return row(entry, { state: "disabled", retry: view.retry });
    const health = feeds.find((feed) => feed.id === entry.id);
    if (health) return row(entry, fromFeed(health, fetchedAt, view.retry ?? noop));
    // No per-feed answer: show the state of the whole request (pending, error) or "unchecked".
    return row(entry, view.state === "pending" || view.state === "error" ? view : { state: "unchecked", retry: view.retry });
  };

  const regulationRow = (entry: SourceCatalogEntry, key: "minambiente" | "presidencia"): FuenteRow => {
    const { snapshot: view, data, fetchedAt } = input.regulation;
    if (!data) return row(entry, view);
    return row(entry, fromBlock(data[key], fetchedAt, view.retry ?? noop));
  };

  const ai = (): FuenteRow => {
    const retry = input.retryStatus ? { retry: input.retryStatus } : {};
    if (input.status.state !== "ok") return row(CATALOG.ai, { state: input.status.state === "pending" ? "pending" : "unchecked", ...retry });
    const { configured, provider, webSearch } = input.status.data.ai;
    if (!configured) {
      return row(CATALOG.ai, {
        state: "disabled",
        error: { kind: "disabled", message: "Falta la clave del proveedor de IA en el servidor." },
        detail: `Proveedor elegido: ${provider}`,
        ...retry,
      });
    }
    return row(CATALOG.ai, { state: "ok", detail: `Configurado · proveedor: ${provider} · búsqueda en internet: ${webSearch ? "sí" : "no"}`, ...retry });
  };

  const xmRow = (): FuenteRow => {
    const xm = row(CATALOG.xm, input.xm);
    return xm.snapshot.state === "disabled" ? { ...xm, snapshot: { ...xm.snapshot, detail: "desactivada por configuración" } } : xm;
  };

  const googleEntry = CATALOG.googleNews;
  const feedEntries = FEED_CATALOG;

  return [
    {
      id: "macro",
      title: "Mercado y macroeconomía",
      rows: [row(CATALOG.trm, input.trm), row(CATALOG.pib, input.pib), row(CATALOG.ipc, input.ipc), row(CATALOG.exports, input.exports)],
    },
    { id: "empresas", title: "Contratación y empresas", rows: [row(CATALOG.secop, input.secop), row(CATALOG.supersociedades, input.supersociedades)] },
    { id: "noticias", title: "Noticias", rows: [...feedEntries.map(feedRow), feedRow(googleEntry)] },
    {
      id: "regulacion",
      title: "Regulación",
      rows: [
        regulationRow(CATALOG.minambiente, "minambiente"),
        regulationRow(CATALOG.presidencia, "presidencia"),
        row(CATALOG.curated, { state: "ok", detail: `${input.curatedCount} normas incluidas en la app` }),
      ],
    },
    {
      id: "otras",
      title: "Energía y asistente",
      rows: [xmRow(), ai()],
    },
  ];
}
