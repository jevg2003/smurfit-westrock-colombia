"use client";

import { revalidateLogic, useForm } from "@tanstack/react-form";
import { RotateCcwIcon } from "lucide-react";
import { useId, useState } from "react";
import { PageIntro } from "@/components/shell/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { NEWS_TERM_GROUPS, type Thresholds } from "@/content/config/empresa";
import { useHydrationStore } from "@/stores/hydration.store";
import { type NewsTermGroupId, usePreferencesStore } from "@/stores/preferences.store";
import { activeRuleTexts } from "./rule-texts";
import { parseTerms, termsSchema, thresholdsSchema, validateThresholds, type ThresholdFields, type ThresholdKey } from "./validate";

interface FieldSpec {
  key: ThresholdKey;
  label: string;
  help: string;
  unit: string;
  inputMode: "decimal" | "numeric";
}

const THRESHOLD_FIELDS: { title: string; description: string; fields: FieldSpec[] }[] = [
  {
    title: "Dólar (TRM)",
    description: "Cuánto debe moverse la TRM de un día a otro para que salga una señal.",
    fields: [
      {
        key: "trmDailyMovePct",
        label: "Variación diaria de la TRM para vigilar",
        help: "Desde este cambio, el día queda marcado como atípico.",
        unit: "%",
        inputMode: "decimal",
      },
      {
        key: "trmDailyAlertPct",
        label: "Variación diaria de la TRM para alertar",
        help: "Desde este cambio, la señal pasa de vigilar a alerta.",
        unit: "%",
        inputMode: "decimal",
      },
    ],
  },
  {
    title: "Energía eléctrica (XM)",
    description: "Cuánto debe moverse el precio de bolsa de la electricidad, de una semana a otra, para que salga una señal.",
    fields: [
      {
        key: "energySpotWeeklyMovePct",
        label: "Variación semanal del precio de bolsa para vigilar",
        help: "Compara el promedio de los últimos 7 días con los 7 días anteriores.",
        unit: "%",
        inputMode: "decimal",
      },
      {
        key: "energySpotWeeklyAlertPct",
        label: "Variación semanal del precio de bolsa para alertar",
        help: "Desde este cambio, la señal pasa de vigilar a alerta.",
        unit: "%",
        inputMode: "decimal",
      },
    ],
  },
  {
    title: "Contratos de la empresa",
    description: "Cuántos días antes del fin de un contrato quieres que te avisemos.",
    fields: [
      {
        key: "contractExpiryWatchDays",
        label: "Días antes del fin para vigilar",
        help: "Un contrato que termina en este plazo o menos queda en vigilancia.",
        unit: "días",
        inputMode: "numeric",
      },
      {
        key: "contractExpiryAlertDays",
        label: "Días antes del fin para alertar",
        help: "Debe ser igual o menor que el plazo para vigilar.",
        unit: "días",
        inputMode: "numeric",
      },
    ],
  },
  {
    title: "Competidores",
    description: "Qué tan reciente debe ser un contrato de la competencia para contarlo como nuevo.",
    fields: [
      {
        key: "competitorContractWindowDays",
        label: "Ventana de contratos nuevos",
        help: "Se cuentan los contratos firmados en este número de días o menos.",
        unit: "días",
        inputMode: "numeric",
      },
    ],
  },
];

const toFields = (thresholds: Thresholds): ThresholdFields => ({
  trmDailyMovePct: String(thresholds.trmDailyMovePct),
  trmDailyAlertPct: String(thresholds.trmDailyAlertPct),
  contractExpiryWatchDays: String(thresholds.contractExpiryWatchDays),
  contractExpiryAlertDays: String(thresholds.contractExpiryAlertDays),
  competitorContractWindowDays: String(thresholds.competitorContractWindowDays),
  energySpotWeeklyMovePct: String(thresholds.energySpotWeeklyMovePct),
  energySpotWeeklyAlertPct: String(thresholds.energySpotWeeklyAlertPct),
});

/** Thresholds and news terms. The page waits for the stores to load so the form starts from saved values. */
export function PreferenciasView() {
  const hasHydrated = useHydrationStore((state) => state.hasHydrated);
  const [generation, setGeneration] = useState(0);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageIntro
        title="Preferencias"
        description="Ajusta cuándo salta una señal y qué palabras buscamos en las noticias. Todo se guarda en este navegador."
        actions={<ResetButton onReset={() => setGeneration((value) => value + 1)} />}
      />
      {!hasHydrated ? (
        <Skeleton role="status" aria-label="Cargando tus preferencias" className="h-96 rounded-xl" />
      ) : (
        <div key={generation} className="grid min-w-0 gap-4 lg:grid-cols-2">
          <ThresholdsCard />
          <div className="flex min-w-0 flex-col gap-4">
            <RulesCard />
            <TermsCard />
          </div>
        </div>
      )}
    </div>
  );
}

function ResetButton({ onReset }: { onReset: () => void }) {
  const reset = usePreferencesStore((state) => state.reset);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        reset();
        onReset();
      }}
    >
      <RotateCcwIcon aria-hidden="true" data-icon="inline-start" />
      Restablecer valores por defecto
    </Button>
  );
}

function ThresholdsCard() {
  const saved = usePreferencesStore((state) => state.thresholds);
  const setThreshold = usePreferencesStore((state) => state.setThreshold);
  const [message, setMessage] = useState<string | null>(null);
  const baseId = useId();

  const defaultValues: ThresholdFields = toFields(saved);
  const form = useForm({
    defaultValues,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: thresholdsSchema },
    onSubmit: ({ value }) => {
      const result = validateThresholds(value);
      if (!result.ok) return;
      for (const key of Object.keys(result.value) as ThresholdKey[]) setThreshold(key, result.value[key]);
      setMessage("Preferencias guardadas. Las reglas ya usan estos valores.");
    },
  });

  return (
    <Card className="min-w-0 gap-0 py-0">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <CardHeader className="border-b px-4 py-3 [.border-b]:pb-3">
          <CardTitle className="text-sm font-semibold">Umbrales de las reglas</CardTitle>
          <CardDescription>Los cambios se aplican a las señales, a las alertas nuevas y al texto de cada regla.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 py-4">
          {THRESHOLD_FIELDS.map((group) => (
            <FieldSet key={group.title} className="min-w-0">
              <FieldLegend variant="label">{group.title}</FieldLegend>
              <FieldDescription>{group.description}</FieldDescription>
              <FieldGroup className="gap-3">
                {group.fields.map((spec) => {
                  const id = `${baseId}-${spec.key}`;
                  return (
                    <form.Field key={spec.key} name={spec.key}>
                      {(field) => {
                        const invalid = !field.state.meta.isValid;
                        return (
                          <Field data-invalid={invalid}>
                            <FieldLabel htmlFor={id}>{spec.label}</FieldLabel>
                            <div className="flex items-center gap-2">
                              <Input
                                id={id}
                                type="text"
                                inputMode={spec.inputMode}
                                value={field.state.value}
                                aria-invalid={invalid || undefined}
                                aria-describedby={`${id}-help`}
                                className="max-w-32"
                                onBlur={field.handleBlur}
                                onChange={(event) => {
                                  field.handleChange(event.target.value);
                                  setMessage(null);
                                }}
                              />
                              <span className="text-sm text-muted-foreground">{spec.unit}</span>
                            </div>
                            <FieldDescription id={`${id}-help`}>{spec.help}</FieldDescription>
                            {invalid && <FieldError errors={field.state.meta.errors} />}
                          </Field>
                        );
                      }}
                    </form.Field>
                  );
                })}
              </FieldGroup>
            </FieldSet>
          ))}
        </CardContent>
        <CardFooter className="flex-wrap gap-3 border-t bg-muted/50 px-4 py-3">
          <Button type="submit" size="sm">
            Guardar cambios
          </Button>
          {message && (
            <p role="status" className="text-xs text-muted-foreground">
              {message}
            </p>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}

function RulesCard() {
  const thresholds = usePreferencesStore((state) => state.thresholds);
  return (
    <Card className="min-w-0 gap-0 py-0">
      <CardHeader className="border-b px-4 py-3 [.border-b]:pb-3">
        <CardTitle className="text-sm font-semibold">Reglas activas</CardTitle>
        <CardDescription>Así se leen hoy las reglas, con los valores guardados.</CardDescription>
      </CardHeader>
      <CardContent className="py-4">
        <ul className="flex flex-col gap-3">
          {activeRuleTexts(thresholds).map((rule) => (
            <li key={rule.id} className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium">{rule.title}</span>
              <span className="text-sm break-words">{rule.text}</span>
              <span className="font-mono text-xs text-muted-foreground">{rule.id}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

const TERM_GROUP_IDS = NEWS_TERM_GROUPS.map((group) => group.id);
const termsFormSchema = termsSchema(TERM_GROUP_IDS);

function TermsCard() {
  const groups = usePreferencesStore((state) => state.newsTermGroups);
  const setGroup = usePreferencesStore((state) => state.setNewsTermGroup);
  const [message, setMessage] = useState<string | null>(null);
  const baseId = useId();

  const defaultValues = Object.fromEntries(NEWS_TERM_GROUPS.map((group) => [group.id, groups[group.id].join("\n")])) as Record<
    NewsTermGroupId,
    string
  >;
  const form = useForm({
    defaultValues,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: termsFormSchema },
    onSubmit: ({ value }) => {
      for (const group of NEWS_TERM_GROUPS) {
        const parsed = parseTerms(value[group.id]);
        if (parsed.ok) setGroup(group.id, parsed.value);
      }
      setMessage("Términos guardados. Se usarán cuando se conecten las noticias.");
    },
  });

  return (
    <Card className="min-w-0 gap-0 py-0">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <CardHeader className="border-b px-4 py-3 [.border-b]:pb-3">
          <CardTitle className="text-sm font-semibold">Términos para noticias</CardTitle>
          <CardDescription>Un término por línea. Las noticias llegan en una próxima versión.</CardDescription>
        </CardHeader>
        <CardContent className="py-4">
          <FieldGroup className="gap-4">
            {NEWS_TERM_GROUPS.map((group) => {
              const id = `${baseId}-${group.id}`;
              return (
                <form.Field key={group.id} name={group.id}>
                  {(field) => {
                    const invalid = !field.state.meta.isValid;
                    return (
                      <Field data-invalid={invalid}>
                        <FieldLabel htmlFor={id}>{group.label}</FieldLabel>
                        <Textarea
                          id={id}
                          rows={4}
                          value={field.state.value}
                          aria-invalid={invalid || undefined}
                          onBlur={field.handleBlur}
                          onChange={(event) => {
                            field.handleChange(event.target.value);
                            setMessage(null);
                          }}
                        />
                        {invalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    );
                  }}
                </form.Field>
              );
            })}
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex-wrap gap-3 border-t bg-muted/50 px-4 py-3">
          <Button type="submit" size="sm">
            Guardar términos
          </Button>
          {message && (
            <p role="status" className="text-xs text-muted-foreground">
              {message}
            </p>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
