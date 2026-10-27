"use client";

import { CheckIcon, PlusIcon } from "lucide-react";
import { useRegisterPageContext } from "@/features/asistente/page-context";
import { followContext } from "@/features/asistente/screen-contexts";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { SettingsContent, SettingsDescription, SettingsHeader, SettingsSection, SettingsTitle } from "@/components/layouts/settings-section";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { withNitCompetitors } from "@/core/company/profile";
import type { IndicatorId } from "@/core/domain/observation";
import { INDICATOR_LABELS } from "@/core/labels";
import { useCompany } from "@/stores/companies.store";
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
  /** Full accessible names, for example "Dejar de seguir a Competidora Uno". */
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
            <Badge variant="success-light">
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

/** What the user follows: competitors (from the company profile) and indicators. It feeds the «Solo lo que sigo» filter. */
export function SeguimientoSettings() {
  const hasHydrated = useHydrationStore((state) => state.hasHydrated);
  const competitors = withNitCompetitors(useCompany());
  const competitorNits = useWatchlistStore((state) => state.competitorNits);
  const indicators = useWatchlistStore((state) => state.indicators);
  const toggleCompetitor = useWatchlistStore((state) => state.toggleCompetitor);
  const toggleIndicator = useWatchlistStore((state) => state.toggleIndicator);
  useRegisterPageContext(followContext(competitorNits, indicators));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <p className="text-sm text-muted-foreground">Elija los competidores e indicadores que le importan. En Resumen active «Solo lo que sigo» para ver solo eso.</p>

      {!hasHydrated ? (
        <Skeleton role="status" aria-label="Cargando lo que sigue" className="h-72 rounded-xl" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SettingsSection>
            <SettingsHeader>
              <SettingsTitle>Competidores</SettingsTitle>
              <SettingsDescription>La lista sale del perfil de la empresa (solo los competidores con NIT). Elija a cuáles sigue.</SettingsDescription>
            </SettingsHeader>
            <SettingsContent>
              <ItemGroup className="gap-2">
                {competitors.map((competitor) => (
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
            </SettingsContent>
          </SettingsSection>

          <SettingsSection>
            <SettingsHeader>
              <SettingsTitle>Indicadores</SettingsTitle>
              <SettingsDescription>
                Hoy solo la TRM genera avisos. Los demás indicadores se guardan para cuando existan reglas para ellos.
              </SettingsDescription>
            </SettingsHeader>
            <SettingsContent>
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
            </SettingsContent>
          </SettingsSection>
        </div>
      )}
    </div>
  );
}
