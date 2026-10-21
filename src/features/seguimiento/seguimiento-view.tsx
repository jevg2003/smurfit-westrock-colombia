"use client";

import { CheckIcon, PlusIcon } from "lucide-react";
import { useRegisterPageContext } from "@/features/asistente/page-context";
import { followContext } from "@/features/asistente/screen-contexts";
import { Badge } from "@/components/reui/badge";
import { PageIntro } from "@/components/shell/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { COMPETITORS } from "@/content/config/empresa";
import type { IndicatorId } from "@/core/domain/observation";
import { INDICATOR_LABELS } from "@/core/labels";
import { useHydrationStore } from "@/stores/hydration.store";
import { useWatchlistStore } from "@/stores/watchlist.store";

const INDICATORS: { id: IndicatorId; help: string }[] = [
  { id: "trm", help: "El precio del dólar en pesos, todos los días." },
  { id: "pib", help: "Cuánto crece la economía cada año." },
  { id: "ipc_anual", help: "Cuánto suben los precios cada año." },
  { id: "exportaciones", help: "Exportaciones no minero-energéticas, por trimestre." },
];

interface FollowRowProps {
  title: string;
  description: string;
  followed: boolean;
  /** Full accessible names, for example "Dejar de seguir a Cartones América". */
  followLabel: string;
  unfollowLabel: string;
  onToggle: () => void;
}

function FollowRow({ title, description, followed, followLabel, unfollowLabel, onToggle }: FollowRowProps) {
  return (
    <Item variant="outline" size="sm">
      <ItemContent>
        <ItemTitle>
          {title}
          {followed && (
            <Badge variant="success-light" size="sm">
              Siguiendo
            </Badge>
          )}
        </ItemTitle>
        <ItemDescription>{description}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button
          variant={followed ? "outline" : "default"}
          size="sm"
          aria-pressed={followed}
          aria-label={followed ? unfollowLabel : followLabel}
          onClick={onToggle}
        >
          {followed ? <CheckIcon aria-hidden="true" data-icon="inline-start" /> : <PlusIcon aria-hidden="true" data-icon="inline-start" />}
          {followed ? "Dejar de seguir" : "Seguir"}
        </Button>
      </ItemActions>
    </Item>
  );
}

/** What the user follows: competitors (from the configured list) and indicators. */
export function SeguimientoView() {
  const hasHydrated = useHydrationStore((state) => state.hasHydrated);
  const competitorNits = useWatchlistStore((state) => state.competitorNits);
  const indicators = useWatchlistStore((state) => state.indicators);
  const toggleCompetitor = useWatchlistStore((state) => state.toggleCompetitor);
  const toggleIndicator = useWatchlistStore((state) => state.toggleIndicator);
  useRegisterPageContext(followContext(competitorNits, indicators));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageIntro
        title="Seguimiento"
        description="Elige los competidores e indicadores que te importan. En el Radar y la Línea de tiempo puedes activar «Solo mis seguimientos» para ver solo eso."
      />

      {!hasHydrated ? (
        <Skeleton role="status" aria-label="Cargando tus seguimientos" className="h-72 rounded-xl" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Competidores</CardTitle>
              <CardDescription>La lista sale de la configuración de la empresa. Aquí eliges a cuáles sigues.</CardDescription>
            </CardHeader>
            <CardContent>
              <ItemGroup className="gap-2">
                {COMPETITORS.map((competitor) => (
                  <FollowRow
                    key={competitor.nit}
                    title={competitor.name}
                    description={`NIT ${competitor.nit}`}
                    followed={competitorNits.includes(competitor.nit)}
                    followLabel={`Seguir a ${competitor.name}`}
                    unfollowLabel={`Dejar de seguir a ${competitor.name}`}
                    onToggle={() => toggleCompetitor(competitor.nit)}
                  />
                ))}
              </ItemGroup>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Indicadores</CardTitle>
              <CardDescription>
                Hoy solo la TRM genera señales. Los demás indicadores se guardan para cuando existan reglas para ellos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ItemGroup className="gap-2">
                {INDICATORS.map((indicator) => (
                  <FollowRow
                    key={indicator.id}
                    title={INDICATOR_LABELS[indicator.id]}
                    description={indicator.help}
                    followed={indicators.includes(indicator.id)}
                    followLabel={`Seguir ${INDICATOR_LABELS[indicator.id]}`}
                    unfollowLabel={`Dejar de seguir ${INDICATOR_LABELS[indicator.id]}`}
                    onToggle={() => toggleIndicator(indicator.id)}
                  />
                ))}
              </ItemGroup>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
