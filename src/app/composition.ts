import type { Clock } from "@/core/ports/clock";
import type { Logger } from "@/core/ports/logger";
import type { SignalAnalyzer } from "@/core/ports/signal-analyzer";
import { NoopSignalAnalyzer } from "@/infrastructure/ai/noop-signal-analyzer";
import { systemClock } from "@/infrastructure/clock/system-clock";
import type { Fetcher } from "@/infrastructure/http/fetcher";
import { consoleLogger } from "@/infrastructure/logging/console-logger";
import { createExportsAdapter } from "@/infrastructure/sources/datos-gov-co/exportaciones/adapter";
import { createSupersociedadesAdapter } from "@/infrastructure/sources/datos-gov-co/supersociedades/adapter";
import { createSecopContractsAdapter } from "@/infrastructure/sources/datos-gov-co/secop-contratos/adapter";
import { createWorldBankAdapter } from "@/infrastructure/sources/world-bank/adapter";
import { createXmAdapter } from "@/infrastructure/sources/xm/adapter";

export interface ContainerOptions {
  fetcher?: Fetcher;
  clock?: Clock;
  logger?: Logger;
}

/**
 * Composition root: the only place that picks concrete adapters for the ports.
 * Replace an adapter here (for example the analyzer) without touching `src/core`.
 */
export function createContainer({ fetcher, clock = systemClock, logger = consoleLogger }: ContainerOptions = {}) {
  const analyzer: SignalAnalyzer = new NoopSignalAnalyzer();
  return {
    clock,
    logger,
    analyzer,
    secop: createSecopContractsAdapter({ fetcher }),
    worldBank: createWorldBankAdapter({ fetcher }),
    xm: createXmAdapter({ fetcher }),
    exports: createExportsAdapter({ fetcher }),
    supersociedades: createSupersociedadesAdapter({ fetcher }),
  };
}

export type Container = ReturnType<typeof createContainer>;
