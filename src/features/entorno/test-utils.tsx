import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { createContainer, type Container } from "@/app/composition";
import type { PublicContract } from "@/core/domain/contract";
import type { SourceId } from "@/core/domain/provenance";
import type { Result, SourceError } from "@/core/domain/result";
import type { SourceAdapter } from "@/core/ports/source-adapter";
import type { SecopQuery } from "@/infrastructure/sources/datos-gov-co/secop-contratos/adapter";
import { useAlertsStore } from "@/stores/alerts.store";
import { useHydrationStore } from "@/stores/hydration.store";
import { usePreferencesStore } from "@/stores/preferences.store";
import { useWatchlistStore } from "@/stores/watchlist.store";
import { COMPETITORS } from "@/content/config/empresa";
import { createFakeClock } from "@/stores/test-utils";
import type { TrmRegistro } from "@/features/trm/types";

export const TEST_NOW = "2026-10-20T15:00:00.000Z";

const disabledNews: Result<never> = {
  ok: false,
  error: { sourceId: "news-rss", kind: "disabled", message: "Fuente desactivada." } satisfies SourceError,
};

export function fakeContainer(
  secop: SourceAdapter<SecopQuery, PublicContract[]>["fetch"],
  overrides: Partial<Container> = {},
) {
  return {
    ...createContainer({ clock: createFakeClock(TEST_NOW) }),
    secop: { sourceId: "secop", fetch: secop } as SourceAdapter<SecopQuery, PublicContract[]>,
    // News and regulation are switched off in screen tests unless a test overrides them: no network.
    news: fakeAdapter("news-rss", async () => disabledNews) as Container["news"],
    regulation: fakeAdapter("minambiente", async () => disabledNews) as Container["regulation"],
    ...overrides,
  };
}

/** An adapter whose `fetch` is the given function, for any source. */
export const fakeAdapter = <Q, T>(sourceId: SourceId, fetch: SourceAdapter<Q, T>["fetch"]): SourceAdapter<Q, T> => ({
  sourceId,
  fetch,
});

export const secopOk = (data: PublicContract[]): Result<{ data: PublicContract[]; provenance: PublicContract["provenance"] }> => ({
  ok: true,
  value: {
    data,
    provenance: {
      sourceId: "secop",
      url: "https://www.datos.gov.co/resource/jbjy-vk9h.json",
      fetchedAt: TEST_NOW,
      license: "CC BY-SA 4.0",
      attribution: "Agencia Nacional de Contratación Pública - Colombia Compra Eficiente vía datos.gov.co",
    },
  },
});

export const secopEmpty: Result<never> = {
  ok: false,
  error: { sourceId: "secop", kind: "empty", message: "SECOP II no devolvió contratos para estos NIT." } satisfies SourceError,
};

export const secopDown: Result<never> = {
  ok: false,
  error: { sourceId: "secop", kind: "network", message: "SECOP II no respondió a tiempo." } satisfies SourceError,
};

export const trmRecord = (day: string, value: string): TrmRegistro => ({
  valor: value,
  unidad: "COP",
  vigenciadesde: `${day}T00:00:00.000`,
  vigenciahasta: `${day}T00:00:00.000`,
});

/** Resets the stores and marks them hydrated, as the app does after mount. */
export function resetStores({ hydrated = true }: { hydrated?: boolean } = {}) {
  useAlertsStore.setState({ alerts: [] });
  usePreferencesStore.getState().reset();
  useWatchlistStore.setState({
    competitorNits: COMPETITORS.map((competitor) => competitor.nit),
    indicators: ["trm"],
    onlyFollowed: false,
  });
  useHydrationStore.setState({ hasHydrated: hydrated });
}

export function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

// jsdom has no matchMedia; the ReUI date selector reads it through `useIsMobile`.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
