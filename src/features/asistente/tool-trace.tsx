import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { DatabaseIcon } from "lucide-react";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";
import { safeHttpUrl } from "@/lib/safe-url";

type Part = UIMessage["parts"][number];
export type ToolPart = Extract<Part, { type: `tool-${string}` | "dynamic-tool" }>;

export const isToolPart = (part: Part): part is ToolPart => isToolUIPart(part);

const LABELS: Record<string, { running: string; done: string }> = {
  get_trm: { running: "Consultando la TRM", done: "Consulté la TRM" },
  get_secop_contracts: { running: "Buscando contratos en SECOP II", done: "Busqué contratos en SECOP II" },
  get_competitor_financials: { running: "Consultando cifras de competidores", done: "Consulté cifras de competidores" },
  get_macro_series: { running: "Consultando indicadores macro", done: "Consulté indicadores macro" },
  get_news: { running: "Consultando las noticias", done: "Consulté las noticias" },
  get_regulation: { running: "Consultando la regulación", done: "Consulté la regulación" },
  get_energy_price: { running: "Consultando el precio de la energía", done: "Consulté el precio de la energía" },
  web_search: { running: "Buscando en internet", done: "Busqué en internet" },
  detect_signals: { running: "Aplicando las reglas de avisos", done: "Apliqué las reglas de avisos" },
};

interface Source {
  name: string;
  url?: string;
  fetchedAt?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

function sourcesOf(output: unknown): Source[] {
  if (!isRecord(output)) return [];
  // Web search (provider tool): its sources are plain page links.
  if (Array.isArray(output.sources)) {
    return output.sources.flatMap((item): Source[] => {
      const url = isRecord(item) && typeof item.url === "string" ? safeHttpUrl(item.url) : undefined;
      return url ? [{ name: new URL(url).hostname, url }] : [];
    });
  }
  const found: unknown[] = [];
  const collect = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(collect);
    else if (isRecord(value) && typeof value.sourceId === "string") found.push(value);
  };
  collect(output.provenance);
  if (isRecord(output.data) && Array.isArray(output.data.signals)) {
    output.data.signals.forEach((signal) => isRecord(signal) && collect(signal.provenance));
  }
  const unique = new Map<string, Source>();
  for (const item of found) {
    if (!isRecord(item)) continue;
    const url = typeof item.url === "string" ? safeHttpUrl(item.url) : undefined;
    const name = typeof item.attribution === "string" ? item.attribution : String(item.sourceId);
    unique.set(`${name}|${url}`, { name, url, fetchedAt: typeof item.fetchedAt === "string" ? item.fetchedAt : undefined });
  }
  return [...unique.values()];
}

function problemOf(part: ToolPart): string | undefined {
  if (part.state === "output-error") return "No pude consultar esta fuente.";
  if (part.state === "output-available" && isRecord(part.output) && "status" in part.output && part.output.status !== "ok") {
    return part.output.status === "empty" ? "La fuente no devolvió datos." : "No pude consultar esta fuente.";
  }
  return undefined;
}

function ToolLine({ part }: { part: ToolPart }) {
  const name = getToolName(part);
  const label = LABELS[name] ?? { running: "Consultando datos", done: "Consulté datos" };
  const running = part.state === "input-streaming" || part.state === "input-available";
  const problem = problemOf(part);
  const sources = part.state === "output-available" ? sourcesOf(part.output) : [];

  const line = (
    <TraceLine status={running ? "running" : problem ? "error" : undefined}>
      <TraceIcon>
        <DatabaseIcon />
      </TraceIcon>
      <TraceTitle>{running ? `${label.running}…` : label.done}</TraceTitle>
      {problem && <TraceDescription>{problem}</TraceDescription>}
    </TraceLine>
  );

  if (sources.length === 0) return line;
  return (
    <TraceCollapsible>
      <TraceCollapsibleTrigger>{line}</TraceCollapsibleTrigger>
      <TraceCollapsibleContent>
        <Trace>
          {sources.map((source) => {
            const content = (
              <TraceLine>
                <TraceTitle>{source.name}</TraceTitle>
                {source.fetchedAt && <TraceDescription>{source.fetchedAt.slice(0, 10)}</TraceDescription>}
              </TraceLine>
            );
            return source.url ? (
              <a key={`${source.name}${source.url}`} href={source.url} target="_blank" rel="noopener noreferrer nofollow">
                {content}
              </a>
            ) : (
              <div key={source.name}>{content}</div>
            );
          })}
        </Trace>
      </TraceCollapsibleContent>
    </TraceCollapsible>
  );
}

/** The data lookups the assistant ran for one answer, as Trace lines with their sources. */
export function ToolTrace({ parts }: { parts: ToolPart[] }) {
  return (
    <Trace aria-label="Consultas del asistente">
      {parts.map((part) => (
        <ToolLine key={part.toolCallId} part={part} />
      ))}
    </Trace>
  );
}
