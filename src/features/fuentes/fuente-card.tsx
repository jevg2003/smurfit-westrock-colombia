import { AlertTriangleIcon, CheckIcon, CircleDashedIcon, ExternalLinkIcon, InboxIcon, LoaderIcon, PowerOffIcon, XIcon, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatHoraBogota } from "@/lib/date";
import { safeHttpUrl } from "@/lib/safe-url";
import type { FuenteRow } from "./build-rows";
import { ACCESS_LABELS } from "./catalog";
import type { RowState } from "./snapshots";
import { ERROR_KIND_LABELS } from "./source-state";

type BadgeVariant = "success-light" | "warning-light" | "destructive-light" | "info-light" | "invert-light" | "primary-light" | "outline";

// Icon tile classes follow the Badge light recipes so the tile and the badge agree.
const STATE_VIEW: Record<RowState, { label: string; variant: BadgeVariant; icon: LucideIcon; tile: string }> = {
  ok: { label: "Funcionando", variant: "success-light", icon: CheckIcon, tile: "border-success/15 bg-success/10 text-success-foreground dark:border-success/25 dark:bg-success/15 dark:text-success" },
  stale: { label: "Dato desactualizado", variant: "warning-light", icon: AlertTriangleIcon, tile: "border-warning/15 bg-warning/10 text-warning-foreground dark:border-warning/25 dark:bg-warning/15 dark:text-warning" },
  error: { label: "Con error", variant: "destructive-light", icon: XIcon, tile: "border-destructive/15 bg-destructive/10 text-destructive-foreground dark:border-destructive/25 dark:bg-destructive/15 dark:text-destructive" },
  empty: { label: "Sin datos", variant: "info-light", icon: InboxIcon, tile: "border-info/15 bg-info/10 text-info-foreground dark:border-info/25 dark:bg-info/15 dark:text-info" },
  disabled: { label: "Desactivada", variant: "invert-light", icon: PowerOffIcon, tile: "border-invert/15 bg-invert/10 text-foreground dark:border-invert/45 dark:bg-invert/35 dark:text-invert-foreground" },
  pending: { label: "Consultando", variant: "primary-light", icon: LoaderIcon, tile: "border-primary/10 bg-primary/10 text-primary dark:border-primary/25 dark:bg-primary/15 dark:text-primary" },
  unchecked: { label: "Sin consultar", variant: "outline", icon: CircleDashedIcon, tile: "border-border bg-muted text-muted-foreground" },
};

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

/** Health card of one source: facts, last success, last error and a retry button. */
export function FuenteCard({ row }: { row: FuenteRow }) {
  const { entry, snapshot, flag } = row;
  const view = STATE_VIEW[snapshot.state];
  const Icon = view.icon;
  const internal = entry.url.startsWith("/");
  const href = internal ? entry.url : safeHttpUrl(entry.url);
  const lastSuccess = snapshot.lastSuccess === undefined ? undefined : formatHoraBogota(new Date(snapshot.lastSuccess).toISOString());

  return (
    <Card size="sm" data-state={snapshot.state}>
      <CardHeader>
        <div className="flex min-w-0 items-start gap-3">
          <span aria-hidden="true" className={`flex size-8 shrink-0 items-center justify-center rounded-md border ${view.tile}`}>
            <Icon className={`size-4 ${snapshot.state === "pending" ? "animate-spin" : ""}`} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <CardTitle>{entry.name}</CardTitle>
            <CardDescription>{entry.organization}</CardDescription>
          </div>
          <Badge variant={view.variant} size="lg">
            {view.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
          <Fact label="Acceso">{ACCESS_LABELS[entry.access]}</Fact>
          <Fact label="Actualización esperada">{entry.frequency}</Fact>
          <Fact label="Licencia">{entry.license}</Fact>
          <Fact label="Atribución">{entry.attribution}</Fact>
          <Fact label="Último dato correcto">{lastSuccess ?? "Aún sin lectura correcta"}</Fact>
          {flag !== undefined && <Fact label="Interruptor del servidor">{flag ? "Activada" : "Desactivada"}</Fact>}
          {snapshot.detail && <Fact label="Detalle">{snapshot.detail}</Fact>}
          <Fact label="Último error">
            {snapshot.error ? (
              <span>
                <Badge variant="destructive-light" size="sm" className="me-1.5 align-middle">
                  {ERROR_KIND_LABELS[snapshot.error.kind]}
                </Badge>
                {snapshot.error.message}
              </span>
            ) : (
              "Ninguno"
            )}
          </Fact>
          {href && (
            <Fact label="Fuente oficial">
              <a
                href={href}
                {...(internal ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                className="inline-flex items-center gap-1 break-all underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {entry.url}
                {!internal && <ExternalLinkIcon aria-hidden="true" className="size-3 shrink-0" />}
              </a>
            </Fact>
          )}
        </dl>
      </CardContent>
      {snapshot.retry && (
        <CardFooter className="justify-end">
          <Button type="button" variant="outline" size="sm" onClick={snapshot.retry} aria-label={`Reintentar ${entry.name}`}>
            Reintentar
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
