"use client";

import { revalidateLogic, useForm, type AnyFieldApi } from "@tanstack/react-form";
import { PlusIcon, XIcon } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/reui/badge";
import { AutoTextareaField, ChipListField, NitField, TextField, useFieldMeta } from "@/components/reui/form-fields";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldLegend, FieldSet } from "@/components/ui/field";
import { competitorNameSchema } from "@/core/company/fields";
import { formatNitWithDv, nitOf, optionalNitInputSchema } from "@/core/company/nit";
import { NEWS_GROUP_IDS, NEWS_GROUP_LABELS } from "@/core/company/profile";
import { confirmFormSchema, type ConfirmValues } from "@/core/onboarding/confirm";
import { StepActions } from "./step-actions";
import { StepForm } from "./step-form";

type Competitor = ConfirmValues["competitors"][number];

/** The small row that adds one competitor: the same name and NIT rules as the competitors of the whole form. */
const competitorRowSchema = z.object({ name: competitorNameSchema, nit: optionalNitInputSchema });

interface CompetitorsEditorProps {
  /** The `competitors` field of the confirm form; its limit comes from the form schema. */
  field: AnyFieldApi;
  onAdd(competitor: Competitor): void;
  onRemove(competitor: Competitor): void;
}

/** Competitors as chips, with a small schema-validated row to add one (name and optional NIT). */
function CompetitorsEditor({ field, onAdd, onRemove }: CompetitorsEditorProps) {
  const value: Competitor[] = field.state.value;
  const meta = useFieldMeta(field);
  const full = meta.maxItems !== undefined && value.length >= meta.maxItems;
  const row = useForm({
    defaultValues: { name: "", nit: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: competitorRowSchema },
    onSubmit: ({ value: entry, formApi }) => {
      const name = entry.name.trim();
      if (!value.some((item) => item.name.toLowerCase() === name.toLowerCase())) onAdd({ name, nit: nitOf(entry.nit) ?? "" });
      formApi.reset();
    },
  });

  return (
    <FieldSet>
      <FieldLegend variant="label">Competidores</FieldLegend>
      {value.length > 0 && (
        <ul aria-label="Competidores" className="flex flex-wrap gap-1">
          {value.map((competitor) => (
            <li key={competitor.name}>
              <Badge variant="outline" className="gap-1 pe-0.5">
                {competitor.name}
                {competitor.nit && <span className="text-muted-foreground tabular-nums">NIT {formatNitWithDv(competitor.nit)}</span>}
                <button
                  type="button"
                  aria-label={`Quitar competidor ${competitor.name}`}
                  onClick={() => onRemove(competitor)}
                  className="inline-flex size-4 items-center justify-center rounded-full outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <XIcon className="size-3" aria-hidden="true" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {/* A row, not a nested form: the confirm form already is one. Enter adds the competitor. */}
      <div
        className="grid items-start gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_auto]"
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          void row.handleSubmit();
        }}
      >
        <row.Field name="name">{(entry) => <TextField field={entry} label="Nombre del competidor" disabled={full} />}</row.Field>
        <row.Field name="nit">{(entry) => <NitField field={entry} label="NIT del competidor" />}</row.Field>
        <Button type="button" variant="outline" disabled={full} className="sm:mt-6" onClick={() => void row.handleSubmit()}>
          <PlusIcon aria-hidden="true" />
          Agregar competidor
        </Button>
      </div>
      <FieldDescription>Solo escriba el NIT si lo conoce: con él se consultan sus contratos.</FieldDescription>
    </FieldSet>
  );
}

interface ConfirmFormProps {
  defaultValues: ConfirmValues;
  busy?: boolean;
  submitLabel: string;
  /** Heading and help of the form; the settings tab already has its own. */
  intro?: { title: string; description: string };
  /** Sits inside a section that already pads it (the Empresa tab of Configuración). */
  embedded?: boolean;
  onBack?(): void;
  onSubmit(values: ConfirmValues): void;
}

/** The whole company profile as one editable form: the last onboarding step and the Empresa tab of Configuración. */
export function ConfirmForm({ defaultValues, busy = false, submitLabel, intro, embedded = false, onBack, onSubmit }: ConfirmFormProps) {
  const form = useForm({
    defaultValues,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: confirmFormSchema },
    onSubmit: ({ value }) => onSubmit(value),
  });

  return (
    <StepForm
      inset={!embedded}
      contentClassName="gap-6"
      actions={<StepActions busy={busy} submitLabel={submitLabel} onBack={onBack} />}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      {intro && (
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight">{intro.title}</h2>
          <p className="text-xs text-muted-foreground">{intro.description}</p>
        </div>
      )}

      <section aria-label="Empresa" className="flex flex-col gap-4">
        <form.Field name="name">{(field) => <TextField field={field} label="Nombre de la empresa" />}</form.Field>
        <form.Field name="nit">
          {(field) => <NitField field={field} label="NIT" hint="Con el NIT se activan Contratación pública y Competidores." />}
        </form.Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field name="sector">{(field) => <TextField field={field} label="Sector" />}</form.Field>
          <form.Field name="city">{(field) => <TextField field={field} label="Ciudad principal" />}</form.Field>
        </div>
        <form.Field name="activity">{(field) => <AutoTextareaField field={field} label="Actividad" rows={2} />}</form.Field>
        <form.Field name="competitors">
          {(field) => (
            <CompetitorsEditor
              field={field}
              onAdd={(competitor) => {
                field.handleChange([...field.state.value, competitor]);
                const company = form.getFieldValue("newsGroups.company");
                if (!company.some((term) => term.toLowerCase() === competitor.name.toLowerCase())) form.setFieldValue("newsGroups.company", [...company, competitor.name]);
              }}
              onRemove={(competitor) => {
                field.handleChange(field.state.value.filter((item) => item.name !== competitor.name));
                form.setFieldValue(
                  "newsGroups.company",
                  form.getFieldValue("newsGroups.company").filter((term) => term !== competitor.name),
                );
              }}
            />
          )}
        </form.Field>
      </section>

      <section aria-label="Búsquedas" className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold">Qué buscamos en las noticias</h3>
        {NEWS_GROUP_IDS.map((groupId) => (
          <form.Field key={groupId} name={`newsGroups.${groupId}`}>
            {(field) => <ChipListField field={field} label={NEWS_GROUP_LABELS[groupId]} placeholder="Escriba un término" />}
          </form.Field>
        ))}
        <form.Field name="regulationKeywords">
          {(field) => <ChipListField field={field} label="Palabras de regulación" placeholder="Escriba una palabra" hint="Filtran los decretos que ve la empresa." />}
        </form.Field>
      </section>

      <section aria-label="Objetivos" className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold">Objetivos</h3>
        <form.Field name="currentSituation">{(field) => <AutoTextareaField field={field} label="Situación actual" />}</form.Field>
        <form.Field name="target">{(field) => <AutoTextareaField field={field} label="Meta" />}</form.Field>
        <form.Field name="priorities">{(field) => <ChipListField field={field} label="Prioridades" placeholder="Escriba una prioridad" />}</form.Field>
      </section>
    </StepForm>
  );
}
