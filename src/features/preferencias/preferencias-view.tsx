"use client";

import { revalidateLogic, useForm, useStore } from "@tanstack/react-form";
import { RotateCcwIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { FormIssues } from "@/features/onboarding/step-form";
import { saveWithFeedback } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { SettingsContent, SettingsDescription, SettingsFooter, SettingsHeader, SettingsSection, SettingsTitle } from "@/components/layouts/settings-section";
import { ChipListField, NumberField } from "@/components/reui/form-fields";
import { FieldDescription, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import type { Thresholds } from "@/core/company/defaults";
import { deriveNewsGroupDefinitions, hasContextTerms, uniqueTerms, type NewsTermGroup } from "@/core/company/profile";
import { useCompany } from "@/stores/companies.store";
import { useHydrationStore } from "@/stores/hydration.store";
import { type NewsTermGroupId, usePreferencesStore } from "@/stores/preferences.store";
import { activeRuleTexts } from "./rule-texts";
import { termsSchema, thresholdsSchema, wordsSchema, type ThresholdKey, type ThresholdValues } from "./validate";

interface FieldSpec {
  key: ThresholdKey;
  label: string;
  help: string;
  unit: string;
}

const THRESHOLD_FIELDS: { title: string; description: string; fields: FieldSpec[] }[] = [
  {
    title: "Dólar (TRM)",
    description: "Cuánto debe moverse la TRM de un día a otro para que salga un aviso.",
    fields: [
      {
        key: "trmDailyMovePct",
        label: "Variación diaria de la TRM para vigilar",
        help: "Desde este cambio, el día queda marcado como atípico.",
        unit: "%",
      },
      {
        key: "trmDailyAlertPct",
        label: "Variación diaria de la TRM para alertar",
        help: "Desde este cambio, el aviso pasa de vigilar a alerta.",
        unit: "%",
      },
    ],
  },
  {
    title: "Energía eléctrica (XM)",
    description: "Cuánto debe moverse el precio de bolsa de la electricidad, de una semana a otra, para que salga un aviso.",
    fields: [
      {
        key: "energySpotWeeklyMovePct",
        label: "Variación semanal del precio de bolsa para vigilar",
        help: "Compara el promedio de los últimos 7 días con los 7 días anteriores.",
        unit: "%",
      },
      {
        key: "energySpotWeeklyAlertPct",
        label: "Variación semanal del precio de bolsa para alertar",
        help: "Desde este cambio, el aviso pasa de vigilar a alerta.",
        unit: "%",
      },
    ],
  },
  {
    title: "Contratos de la empresa",
    description: "Cuántos días antes del fin de un contrato quiere que le avisemos.",
    fields: [
      {
        key: "contractExpiryWatchDays",
        label: "Días antes del fin para vigilar",
        help: "Un contrato que termina en este plazo o menos queda en vigilancia.",
        unit: "días",
      },
      {
        key: "contractExpiryAlertDays",
        label: "Días antes del fin para alertar",
        help: "Debe ser igual o menor que el plazo para vigilar.",
        unit: "días",
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
      },
    ],
  },
];

const THRESHOLD_KEYS = THRESHOLD_FIELDS.flatMap((group) => group.fields.map((spec) => spec.key));
const toValues = (thresholds: Thresholds): ThresholdValues => Object.fromEntries(THRESHOLD_KEYS.map((key) => [key, thresholds[key]])) as ThresholdValues;

/** Thresholds and news terms. The page waits for the stores to load so the form starts from saved values. */
export function PreferenciasView() {
  const hasHydrated = useHydrationStore((state) => state.hasHydrated);
  const [generation, setGeneration] = useState(0);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Ajuste cuándo salta un aviso y qué palabras se buscan en las noticias. Todo se guarda en este navegador.</p>
        <ResetButton onReset={() => setGeneration((value) => value + 1)} />
      </div>
      {!hasHydrated ? (
        <Skeleton role="status" aria-label="Cargando las preferencias" className="h-96 rounded-xl" />
      ) : (
        <div key={generation} className="flex min-w-0 flex-col gap-6">
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

  const form = useForm({
    defaultValues: toValues(saved),
    validationLogic: revalidateLogic(),
    validators: { onDynamic: thresholdsSchema },
    onSubmit: ({ value }) => {
      // The schema accepted the form, so every threshold is a number here.
      const done = saveWithFeedback(() => {
        for (const key of THRESHOLD_KEYS) setThreshold(key, value[key] as number);
      });
      // The saved values become the baseline, so the actions go away until the next edit.
      if (done) form.reset(value);
    },
  });
  const unchanged = useStore(form.store, (state) => state.isDefaultValue);

  return (
    <SettingsSection>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <SettingsHeader>
          <SettingsTitle>Umbrales de las reglas</SettingsTitle>
          <SettingsDescription>Los cambios se aplican a los avisos y al texto de cada regla.</SettingsDescription>
        </SettingsHeader>
        <SettingsContent>
          {THRESHOLD_FIELDS.map((group) => (
            <FieldSet key={group.title} className="min-w-0">
              <FieldLegend variant="label">{group.title}</FieldLegend>
              <FieldDescription>{group.description}</FieldDescription>
              <FieldGroup className="gap-3">
                {group.fields.map((spec) => (
                  <form.Field key={spec.key} name={spec.key}>
                    {(field) => <NumberField field={field} label={spec.label} hint={spec.help} unit={spec.unit} />}
                  </form.Field>
                ))}
              </FieldGroup>
            </FieldSet>
          ))}
        </SettingsContent>
        {!unchanged && (
          <SettingsFooter>
            <FormIssues form={form} schema={thresholdsSchema} />
            <Button type="submit" size="sm">
              Guardar cambios
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => form.reset()}>
              Descartar
            </Button>
          </SettingsFooter>
        )}
      </form>
    </SettingsSection>
  );
}

function RulesCard() {
  const company = useCompany();
  const thresholds = usePreferencesStore((state) => state.thresholds);
  return (
    <SettingsSection>
      <SettingsHeader>
        <SettingsTitle>Reglas activas</SettingsTitle>
        <SettingsDescription>Así se leen hoy las reglas, con los valores guardados.</SettingsDescription>
      </SettingsHeader>
      <SettingsContent>
        <ul className="flex flex-col gap-3">
          {activeRuleTexts(thresholds, company).map((rule) => (
            <li key={rule.id} className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium">{rule.title}</span>
              <span className="text-sm break-words">{rule.text}</span>
              <span className="font-mono text-xs text-muted-foreground">{rule.id}</span>
            </li>
          ))}
        </ul>
      </SettingsContent>
    </SettingsSection>
  );
}

const contextKey = (id: NewsTermGroupId) => `${id}Context`;
const excludeKey = (id: NewsTermGroupId) => `${id}Exclude`;

function TermsCard() {
  const company = useCompany();
  const definitions = useMemo(() => deriveNewsGroupDefinitions(company), [company]);
  const groupsWithContext = useMemo(() => definitions.filter(hasContextTerms), [definitions]);
  const termsFormSchema = useMemo(
    () =>
      termsSchema(definitions.map((group) => group.id)).extend(
        wordsSchema([...groupsWithContext.map((group) => contextKey(group.id)), ...definitions.map((group) => excludeKey(group.id))]).shape,
      ),
    [definitions, groupsWithContext],
  );
  const groups = usePreferencesStore((state) => state.newsTermGroups);
  const setGroup = usePreferencesStore((state) => state.setNewsTermGroup);
  const context = usePreferencesStore((state) => state.newsContext);
  const setContext = usePreferencesStore((state) => state.setNewsContext);
  const defaultValues: Record<string, string[]> = {
    ...Object.fromEntries(definitions.map((group) => [group.id, [...groups[group.id]]])),
    ...Object.fromEntries(groupsWithContext.map((group) => [contextKey(group.id), [...context[group.id].requireAny]])),
    ...Object.fromEntries(definitions.map((group) => [excludeKey(group.id), [...context[group.id].excludeAny]])),
  };
  const form = useForm({
    defaultValues,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: termsFormSchema },
    onSubmit: ({ value }) => {
      const done = saveWithFeedback(() => {
        for (const group of definitions) {
          setGroup(group.id, uniqueTerms(value[group.id]));
          const requireAny = value[contextKey(group.id)] ?? context[group.id].requireAny;
          setContext(group.id, { requireAny: uniqueTerms(requireAny), excludeAny: uniqueTerms(value[excludeKey(group.id)]) });
        }
      });
      // Repeated terms were merged on save, so the baseline is the merged lists.
      if (done) form.reset(Object.fromEntries(Object.entries(value).map(([key, terms]) => [key, uniqueTerms(terms)])));
    },
  });
  const unchanged = useStore(form.store, (state) => state.isDefaultValue);

  return (
    <SettingsSection>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <SettingsHeader>
          <SettingsTitle>Términos para noticias</SettingsTitle>
          <SettingsDescription>Escriba un término o palabra y pulse Enter. El contexto y las exclusiones acotan las noticias a Colombia.</SettingsDescription>
        </SettingsHeader>
        <SettingsContent>
          <FieldGroup className="gap-4">
            {definitions.map((group) => (
              <FieldSet key={group.id} className="gap-3">
                <FieldLegend variant="label">{group.label}</FieldLegend>
                <form.Field name={group.id}>
                  {(field) => <ChipListField field={field} label={group.label} placeholder="Escriba un término" />}
                </form.Field>
                {hasContextTerms(group) && (
                  <form.Field name={contextKey(group.id)}>
                    {(field) => <ChipListField field={field} label={`Palabras de contexto (${group.label})`} placeholder="Escriba una palabra" hint={contextHelp(group)} />}
                  </form.Field>
                )}
                <form.Field name={excludeKey(group.id)}>
                  {(field) => (
                    <ChipListField
                      field={field}
                      label={`Palabras a excluir (${group.label})`}
                      placeholder="Escriba una palabra"
                      hint="Si el titular trae una de estas palabras, se descarta."
                    />
                  )}
                </form.Field>
              </FieldSet>
            ))}
          </FieldGroup>
        </SettingsContent>
        {!unchanged && (
          <SettingsFooter>
            <FormIssues form={form} schema={termsFormSchema} />
            <Button type="submit" size="sm">
              Guardar términos
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => form.reset()}>
              Descartar
            </Button>
          </SettingsFooter>
        )}
      </form>
    </SettingsSection>
  );
}

const contextHelp = (group: NewsTermGroup) =>
  group.contextTerms === "all"
    ? "Los términos de este grupo solo cuentan si el titular trae una de estas palabras, o si viene de un medio colombiano."
    : `${group.contextTerms.join(" y ")} solo cuenta si el titular trae una de estas palabras, o si viene de un medio colombiano.`;
