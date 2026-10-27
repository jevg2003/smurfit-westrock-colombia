import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { CompanyContext } from "@/core/company/context";
import { DEFAULT_THRESHOLDS } from "@/core/company/defaults";
import type { CompanyFinancials } from "@/core/domain/company";
import type { PublicContract } from "@/core/domain/contract";
import type { Observation } from "@/core/domain/observation";
import type { Provenance } from "@/core/domain/provenance";
import type { Result } from "@/core/domain/result";
import type { RegulationEntry } from "@/core/domain/regulation";
import type { Clock } from "@/core/ports/clock";
import type { SourceAdapter } from "@/core/ports/source-adapter";
import { DEFAULT_SIGNAL_RULES } from "@/core/rules/default-rules";
import { detectSignals } from "@/core/usecases/detect-signals";
import type { WorldBankQuery } from "@/infrastructure/sources/world-bank/adapter";
import { contractExpiry, type ExpiryThresholds } from "@/core/rules/contract-expiry";
import type { RegulationResponse } from "@/infrastructure/sources/regulation/types";
import type { NewsResponse } from "@/infrastructure/sources/rss/service";
import type { XmQuery } from "@/infrastructure/sources/xm/adapter";
import { wrapUntrusted } from "./system-prompt";

export const TRM_SOURCE_URL = "https://www.datos.gov.co/resource/mcec-87by.json";

export interface TrmRow {
  valor: string;
  unidad: string;
  vigenciadesde: string;
  vigenciahasta: string;
}

/** Everything the tools read. Injected so tests never touch the network. */
export interface AssistantToolDeps {
  clock: Clock;
  fetchTrm(days: number): Promise<TrmRow[]>;
  secop: SourceAdapter<{ nits: string[] }, PublicContract[]>;
  worldBank: SourceAdapter<WorldBankQuery, Observation[]>;
  exports: SourceAdapter<Record<string, never>, Observation[]>;
  supersociedades: SourceAdapter<{ nits: string[] }, CompanyFinancials[]>;
  xm: SourceAdapter<XmQuery, Observation[]>;
  news(limit: number): Promise<NewsResponse>;
  regulation(): Promise<RegulationResponse>;
  curatedNorms(): RegulationEntry[];
  /** The user's contract-expiry windows (Preferencias). "Soon" means within `watchDays`. */
  thresholds: ExpiryThresholds;
  /** The active company, sent by the browser. Its NIT and its competitors' NITs are the only ones the tools look up. */
  company: CompanyContext;
}

export type ExpiryStatus = "alerta" | "vigilar" | "fuera de ventana" | "vencido" | "terminado" | "sin fecha de fin";

/** Same rule as the Contratación screen (`contractExpiry`), named for the model. */
function expiryStatus(contract: PublicContract, now: Date, thresholds: ExpiryThresholds): { status: ExpiryStatus; days: number | null } {
  const expiry = contractExpiry(contract, now, thresholds);
  const days = expiry.days ?? null;
  if (expiry.label === "Terminado") return { status: "terminado", days };
  if (expiry.label === "Sin fecha de fin") return { status: "sin fecha de fin", days };
  if (days !== null && days < 0) return { status: "vencido", days };
  if (expiry.level === "alert") return { status: "alerta", days };
  if (expiry.level === "watch") return { status: "vigilar", days };
  return { status: "fuera de ventana", days };
}

export interface ToolProvenance {
  sourceId: Provenance["sourceId"];
  url: string;
  license: string;
  attribution: string;
  fetchedAt: string;
}

export type ToolOutput =
  | { status: "ok"; data: unknown; provenance?: ToolProvenance | ToolProvenance[] }
  | { status: "empty"; message: string }
  | { status: "error"; message: string };

const NO_NIT_MESSAGE = "La empresa no tiene NIT en su perfil: no hay contratos públicos ni cifras financieras para consultar.";

const toProvenance = (p: Provenance): ToolProvenance => ({
  sourceId: p.sourceId,
  url: p.url,
  license: p.license,
  attribution: p.attribution,
  fetchedAt: p.fetchedAt,
});

const day = (iso: string) => iso.slice(0, 10);
const DAY_MS = 86_400_000;

function failure(error: unknown): ToolOutput {
  return { status: "error", message: error instanceof Error ? error.message : String(error) };
}

function fromResult<T>(
  result: Result<{ data: T; provenance: Provenance }>,
  pick: (data: T, provenance: Provenance) => unknown,
): ToolOutput {
  if (result.ok) {
    return { status: "ok", data: pick(result.value.data, result.value.provenance), provenance: toProvenance(result.value.provenance) };
  }
  if (result.error.kind === "empty") return { status: "empty", message: "La fuente respondió sin datos." };
  return { status: "error", message: result.error.message };
}

/** Marks the output of every tool as untrusted data before it reaches the model. */
const modelOutput = ({ output }: { output: unknown }) => ({
  type: "text" as const,
  value: wrapUntrusted("tool_result", JSON.stringify(output)),
});

/**
 * Read-only tools of the assistant. They reuse the same adapters and the same pure rules as the
 * screens, so the assistant can never show data the app cannot show.
 */
export function createAssistantTools(deps: AssistantToolDeps) {
  const competitors = deps.company.competitors.flatMap((competitor) => (competitor.nit ? [{ nit: competitor.nit, name: competitor.name }] : []));
  const watchedNits = [...(deps.company.nit ? [deps.company.nit] : []), ...competitors.map((competitor) => competitor.nit)];
  const names = new Map<string, string>([...(deps.company.nit ? [[deps.company.nit, deps.company.name] as const] : []), ...competitors.map((competitor) => [competitor.nit, competitor.name] as const)]);
  const nitSchema = z
    .string()
    .refine((value) => watchedNits.includes(value), "Debe ser el NIT de la empresa o de un competidor vigilado")
    .describe("NIT of the company or of a watched competitor");
  const now = () => deps.clock.now();
  const options = () => ({ now: now() });

  const trmProvenance = (): ToolProvenance => ({
    sourceId: "trm",
    url: TRM_SOURCE_URL,
    license: "CC BY-SA 4.0",
    attribution: "Superintendencia Financiera de Colombia vía datos.gov.co",
    fetchedAt: now().toISOString(),
  });

  return {
    get_trm: tool({
      description: "Colombian peso per US dollar exchange rate (TRM), newest first, with the change versus the previous day.",
      inputSchema: z.object({ days: z.number().int().min(1).max(365).default(30).describe("How many daily values to return") }),
      execute: async ({ days }): Promise<ToolOutput> => {
        try {
          const rows = await deps.fetchTrm(Math.min(days + 1, 366));
          if (rows.length === 0) return { status: "empty", message: "La fuente respondió sin datos." };
          const values = rows.map((row) => ({ date: day(row.vigenciadesde), value: Number(row.valor) }));
          const [latest, previous] = values;
          return {
            status: "ok",
            data: {
              unit: "COP por USD",
              latest,
              previousChangePct: previous && previous.value ? ((latest.value - previous.value) / previous.value) * 100 : null,
              values: values.slice(0, days),
            },
            provenance: trmProvenance(),
          };
        } catch (error) {
          return failure(error);
        }
      },
      toModelOutput: modelOutput,
    }),

    get_secop_contracts: tool({
      description: `Public contracts (SECOP II) of the company and its watched competitors. Each contract has daysToEnd, expiryStatus (alerta, vigilar, fuera de ventana, vencido, terminado), processUrl (link to the record) and provenance. "Soon" means inside the user's watch window (${deps.thresholds.watchDays} days; alert ${deps.thresholds.alertDays} days): use onlyExpiringSoon for questions like "which contracts expire soon". Optionally one NIT.`,
      inputSchema: z.object({
        nit: nitSchema.optional(),
        onlyExpiringSoon: z.boolean().optional().describe("Keep only contracts inside the watch window (status alerta or vigilar), soonest end first"),
        endsWithinDays: z.number().int().min(1).max(730).optional().describe("Keep only contracts ending within this many days"),
        limit: z.number().int().min(1).max(40).default(15),
      }),
      execute: async ({ nit, onlyExpiringSoon, endsWithinDays, limit }): Promise<ToolOutput> => {
        try {
          if (watchedNits.length === 0) return { status: "empty", message: NO_NIT_MESSAGE };
          const result = await deps.secop.fetch({ nits: nit ? [nit] : watchedNits }, options());
          return fromResult(result, (contracts) => {
            const from = now().getTime();
            const horizon = endsWithinDays === undefined ? undefined : from + endsWithinDays * DAY_MS;
            const enriched = contracts.map((contract) => ({ contract, expiry: expiryStatus(contract, now(), deps.thresholds) }));
            const byEnd = Boolean(onlyExpiringSoon) || endsWithinDays !== undefined;
            const kept = enriched
              .filter(({ contract, expiry }) => {
                if (onlyExpiringSoon && expiry.status !== "alerta" && expiry.status !== "vigilar") return false;
                if (horizon === undefined) return true;
                const ends = contract.endsAt ? Date.parse(contract.endsAt) : Number.NaN;
                return ends >= from && ends <= horizon;
              })
              .sort((a, b) =>
                byEnd
                  ? Date.parse(a.contract.endsAt ?? "") - Date.parse(b.contract.endsAt ?? "")
                  : Date.parse(b.contract.signedAt) - Date.parse(a.contract.signedAt),
              );
            return {
              total: kept.length,
              watchDays: deps.thresholds.watchDays,
              alertDays: deps.thresholds.alertDays,
              contracts: kept.slice(0, limit).map(({ contract, expiry }) => ({
                id: contract.id,
                supplier: contract.supplierName,
                supplierNit: contract.supplierNit,
                entity: contract.entity,
                value: contract.value,
                currency: "COP",
                signedAt: day(contract.signedAt),
                endsAt: contract.endsAt ? day(contract.endsAt) : null,
                daysToEnd: expiry.days,
                expiryStatus: expiry.status,
                status: contract.status,
                processUrl: contract.processUrl ?? null,
                provenance: toProvenance(contract.provenance),
              })),
            };
          });
        } catch (error) {
          return failure(error);
        }
      },
      toModelOutput: modelOutput,
    }),

    get_competitor_financials: tool({
      description: "Annual financial figures (revenue, net income, assets) of the company and its competitors from Supersociedades.",
      inputSchema: z.object({ nit: nitSchema.optional() }),
      execute: async ({ nit }): Promise<ToolOutput> => {
        try {
          if (watchedNits.length === 0) return { status: "empty", message: NO_NIT_MESSAGE };
          const result = await deps.supersociedades.fetch({ nits: nit ? [nit] : watchedNits }, options());
          return fromResult(result, (rows) => ({
            financials: rows
              .filter((row) => !nit || row.nit === nit)
              .map((row) => ({
                nit: row.nit,
                name: names.get(row.nit) ?? row.name,
                cutoffYear: row.cutoffYear,
                revenue: row.revenue,
                netIncome: row.netIncome,
                totalAssets: row.totalAssets ?? null,
                unitNote: row.unitNote,
              })),
          }));
        } catch (error) {
          return failure(error);
        }
      },
      toModelOutput: modelOutput,
    }),

    get_macro_series: tool({
      description:
        "Colombian macro series: annual GDP growth (pib) and annual inflation (ipc_anual) from the World Bank, or non-mining-energy exports (exportaciones).",
      inputSchema: z.object({
        indicator: z.enum(["pib", "ipc_anual", "exportaciones"]),
        last: z.number().int().min(1).max(40).default(10).describe("How many latest observations to return"),
      }),
      execute: async ({ indicator, last }): Promise<ToolOutput> => {
        try {
          const result =
            indicator === "exportaciones"
              ? await deps.exports.fetch({}, options())
              : await deps.worldBank.fetch({ indicator }, options());
          return fromResult(result, (observations) => ({
            indicator,
            observations: [...observations]
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(-last)
              .map((observation) => ({ date: observation.date, value: observation.value, unit: observation.unit })),
          }));
        } catch (error) {
          return failure(error);
        }
      },
      toModelOutput: modelOutput,
    }),

    get_news: tool({
      description: "Recent Colombian news headlines (media RSS and Google News) about the company, the sector, regulation and operations. Titles and links only.",
      inputSchema: z.object({ limit: z.number().int().min(1).max(30).default(10) }),
      execute: async ({ limit }): Promise<ToolOutput> => {
        try {
          const response = await deps.news(150);
          if (response.items.length === 0) return { status: "empty", message: "No hay titulares disponibles ahora." };
          return {
            status: "ok",
            data: {
              items: response.items.slice(0, limit).map((item) => ({
                title: item.title,
                outlet: item.outlet,
                publishedAt: item.publishedAt,
                url: item.url,
              })),
              sourcesMissing: response.feeds.filter((feed) => feed.status === "error").map((feed) => feed.outlet),
            },
            provenance: {
              sourceId: "news-rss",
              url: "https://news.google.com/",
              license: "Solo titulares y enlaces; el contenido pertenece a cada medio",
              attribution: "Medios colombianos vía RSS y Google News",
              fetchedAt: response.fetchedAt,
            },
          };
        } catch (error) {
          return failure(error);
        }
      },
      toModelOutput: modelOutput,
    }),

    get_regulation: tool({
      description: "Regulation that matters to the company: hand-picked norms (curated, with the date they were reviewed) and recent Minambiente posts and Presidencia decrees.",
      inputSchema: z.object({ limit: z.number().int().min(1).max(30).default(10) }),
      execute: async ({ limit }): Promise<ToolOutput> => {
        try {
          const response = await deps.regulation();
          const blocks = { minambiente: response.minambiente, presidencia: response.presidencia };
          const publications = [...response.minambiente.items, ...response.presidencia.items]
            .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
            .slice(0, limit)
            .map((item) => ({ kind: item.kind, title: item.title, summary: item.summary ?? null, publishedAt: item.publishedAt, url: item.url }));
          return {
            status: "ok",
            data: {
              curated: deps.curatedNorms().map((norm) => ({
                name: norm.name,
                date: norm.date,
                topic: norm.topic,
                whyItMatters: norm.whyItMatters,
                url: norm.url,
                reviewedAt: norm.reviewedAt,
              })),
              publications,
              sourcesMissing: Object.entries(blocks)
                .filter(([, block]) => block.status === "error")
                .map(([id]) => id),
            },
            provenance: {
              sourceId: "curated",
              url: "https://www.minambiente.gov.co/",
              license: "Normas elegidas a mano; el texto oficial está en cada enlace",
              attribution: "Minambiente, Presidencia (datos.gov.co) y normas curadas",
              fetchedAt: response.fetchedAt,
            },
          };
        } catch (error) {
          return failure(error);
        }
      },
      toModelOutput: modelOutput,
    }),

    get_energy_price: tool({
      description: "National spot electricity price in Colombia (XM, daily mean, COP/kWh), oldest to newest.",
      inputSchema: z.object({ last: z.number().int().min(1).max(31).default(7).describe("How many latest days to return") }),
      execute: async ({ last }): Promise<ToolOutput> => {
        try {
          const result = await deps.xm.fetch({}, options());
          return fromResult(result, (observations) => ({
            unit: "COP/kWh",
            observations: [...observations]
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(-last)
              .map((observation) => ({ date: observation.date, value: observation.value })),
          }));
        } catch (error) {
          return failure(error);
        }
      },
      toModelOutput: modelOutput,
    }),

    detect_signals: tool({
      description:
        "Runs the app's written rules (TRM moves, expiring contracts, new competitor contracts) with the default thresholds and returns the signals that fire.",
      inputSchema: z.object({}),
      execute: async (): Promise<ToolOutput> => {
        try {
          const [trm, secop] = await Promise.all([
            deps.fetchTrm(365),
            watchedNits.length > 0 ? deps.secop.fetch({ nits: watchedNits }, options()) : Promise.resolve(undefined),
          ]);
          const contracts = secop?.ok ? secop.value.data : [];
          const signalThresholds = { ...DEFAULT_THRESHOLDS, contractExpiryWatchDays: deps.thresholds.watchDays, contractExpiryAlertDays: deps.thresholds.alertDays };
          const signals = detectSignals(
            {
              contracts,
              trmRecords: trm.map((row) => ({ validFrom: row.vigenciadesde, value: row.valor })),
              trmFetchedAt: now().toISOString(),
              ...(deps.company.nit ? { companyNit: deps.company.nit } : {}),
              competitors,
            },
            DEFAULT_SIGNAL_RULES,
            deps.clock,
            signalThresholds,
          );
          return {
            status: "ok",
            data: {
              thresholds: signalThresholds,
              total: signals.length,
              sourcesMissing: secop && !secop.ok ? ["secop"] : [],
              signals: signals.slice(0, 20).map((signal) => ({
                id: signal.id,
                ruleId: signal.ruleId,
                rule: signal.ruleText,
                severity: signal.severity,
                title: signal.title,
                detail: signal.detail,
                occurredAt: signal.occurredAt,
                provenance: signal.provenance.map(toProvenance),
              })),
            },
          };
        } catch (error) {
          return failure(error);
        }
      },
      toModelOutput: modelOutput,
    }),
  } satisfies ToolSet;
}

export type AssistantTools = ReturnType<typeof createAssistantTools>;
