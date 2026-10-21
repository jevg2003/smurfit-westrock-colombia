import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { COMPANY, COMPETITORS, DEFAULT_THRESHOLDS } from "@/content/config/empresa";
import type { CompanyFinancials } from "@/core/domain/company";
import type { PublicContract } from "@/core/domain/contract";
import type { Observation } from "@/core/domain/observation";
import type { Provenance } from "@/core/domain/provenance";
import type { Result } from "@/core/domain/result";
import type { Clock } from "@/core/ports/clock";
import type { SourceAdapter } from "@/core/ports/source-adapter";
import { DEFAULT_SIGNAL_RULES } from "@/core/rules/default-rules";
import { detectSignals } from "@/core/usecases/detect-signals";
import type { WorldBankQuery } from "@/infrastructure/sources/world-bank/adapter";
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

const WATCHED_NITS = [COMPANY.nit, ...COMPETITORS.map((competitor) => competitor.nit)] as [string, ...string[]];
const nitSchema = z.enum(WATCHED_NITS).describe("NIT of the company or of a watched competitor");
const NAMES = new Map([COMPANY, ...COMPETITORS].map((company) => [company.nit, company.name]));

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
      description:
        "Public contracts (SECOP II) of the company and its watched competitors, newest signed first. Optionally only one NIT or only those ending soon.",
      inputSchema: z.object({
        nit: nitSchema.optional(),
        endsWithinDays: z.number().int().min(1).max(730).optional().describe("Keep only contracts ending within this many days"),
        limit: z.number().int().min(1).max(40).default(15),
      }),
      execute: async ({ nit, endsWithinDays, limit }): Promise<ToolOutput> => {
        try {
          const result = await deps.secop.fetch({ nits: nit ? [nit] : WATCHED_NITS }, options());
          return fromResult(result, (contracts) => {
            const from = now().getTime();
            const horizon = endsWithinDays === undefined ? undefined : from + endsWithinDays * DAY_MS;
            const kept = contracts
              .filter((contract) => {
                if (horizon === undefined) return true;
                const ends = contract.endsAt ? Date.parse(contract.endsAt) : Number.NaN;
                return ends >= from && ends <= horizon;
              })
              .sort((a, b) => Date.parse(b.signedAt) - Date.parse(a.signedAt));
            return {
              total: kept.length,
              contracts: kept.slice(0, limit).map((contract) => ({
                id: contract.id,
                supplier: contract.supplierName,
                supplierNit: contract.supplierNit,
                entity: contract.entity,
                value: contract.value,
                signedAt: day(contract.signedAt),
                endsAt: contract.endsAt ? day(contract.endsAt) : null,
                status: contract.status,
                url: contract.processUrl ?? null,
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
          const result = await deps.supersociedades.fetch({ nits: nit ? [nit] : WATCHED_NITS }, options());
          return fromResult(result, (rows) => ({
            financials: rows
              .filter((row) => !nit || row.nit === nit)
              .map((row) => ({
                nit: row.nit,
                name: NAMES.get(row.nit) ?? row.name,
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

    detect_signals: tool({
      description:
        "Runs the app's written rules (TRM moves, expiring contracts, new competitor contracts) with the default thresholds and returns the signals that fire.",
      inputSchema: z.object({}),
      execute: async (): Promise<ToolOutput> => {
        try {
          const [trm, secop] = await Promise.all([deps.fetchTrm(365), deps.secop.fetch({ nits: WATCHED_NITS }, options())]);
          const contracts = secop.ok ? secop.value.data : [];
          const signals = detectSignals(
            {
              contracts,
              trmRecords: trm.map((row) => ({ validFrom: row.vigenciadesde, value: row.valor })),
              trmFetchedAt: now().toISOString(),
              companyNit: COMPANY.nit,
              competitors: COMPETITORS,
            },
            DEFAULT_SIGNAL_RULES,
            deps.clock,
            DEFAULT_THRESHOLDS,
          );
          return {
            status: "ok",
            data: {
              thresholds: DEFAULT_THRESHOLDS,
              total: signals.length,
              sourcesMissing: secop.ok ? [] : ["secop"],
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
