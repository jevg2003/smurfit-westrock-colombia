"use client";

import { revalidateLogic, useForm } from "@tanstack/react-form";
import { PlusIcon, XIcon } from "lucide-react";
import { useId, useState } from "react";
import { Badge } from "@/components/reui/badge";
import { AutoTextareaField, ChipListField, TextField } from "@/components/reui/form-fields";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldError, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NEWS_GROUP_IDS, NEWS_GROUP_LABELS } from "@/core/company/profile";
import { confirmFormSchema, type ConfirmValues } from "@/core/onboarding/confirm";
import { NIT_ERROR } from "./seed-form";
import { StepActions } from "./step-actions";

type Competitor = ConfirmValues["competitors"][number];

interface CompetitorsEditorProps {
  value: Competitor[];
  onAdd(competitor: Competitor): void;
  onRemove(competitor: Competitor): void;
}

/** Competitors as chips, with a small row to add one (name and optional NIT). */
function CompetitorsEditor({ value, onAdd, onRemove }: CompetitorsEditorProps) {
  const id = useId();
  const [name, setName] = useState("");
  const [nit, setNit] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!/^(\d{5,12})?$/.test(nit.trim())) {
      setError(NIT_ERROR);
      return;
    }
    if (!value.some((item) => item.name.toLowerCase() === trimmed.toLowerCase())) onAdd({ name: trimmed, nit: nit.trim() });
    setName("");
    setNit("");
    setError(null);
  };

  return (
    <FieldSet>
      <FieldLegend variant="label">Competidores</FieldLegend>
      {value.length > 0 && (
        <ul aria-label="Competidores" className="flex flex-wrap gap-1">
          {value.map((competitor) => (
            <li key={competitor.name}>
              <Badge variant="outline" className="gap-1 pe-0.5">
                {competitor.name}
                {competitor.nit && <span className="text-muted-foreground tabular-nums">NIT {competitor.nit}</span>}
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
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)_auto]">
        <Input aria-label="Nombre del competidor" placeholder="Nombre" value={name} onChange={(event) => setName(event.target.value)} />
        <Input
          aria-label="NIT del competidor (opcional)"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          inputMode="numeric"
          placeholder="NIT"
          value={nit}
          onChange={(event) => setNit(event.target.value)}
        />
        <Button type="button" variant="outline" onClick={add}>
          <PlusIcon aria-hidden="true" />
          Agregar competidor
        </Button>
      </div>
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : <FieldDescription>Solo escriba el NIT si lo conoce: con él se consultan sus contratos.</FieldDescription>}
    </FieldSet>
  );
}

interface ConfirmFormProps {
  defaultValues: ConfirmValues;
  busy?: boolean;
  submitLabel: string;
  /** Heading and help of the form; the settings tab already has its own. */
  intro?: { title: string; description: string };
  onBack?(): void;
  onSubmit(values: ConfirmValues): void;
}

/** The whole company profile as one editable form: the last onboarding step and the Empresa tab of Configuración. */
export function ConfirmForm({ defaultValues, busy = false, submitLabel, intro, onBack, onSubmit }: ConfirmFormProps) {
  const form = useForm({
    defaultValues,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: confirmFormSchema },
    onSubmit: ({ value }) => onSubmit(value),
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
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
          {(field) => <TextField field={field} label="NIT (opcional)" hint="Con el NIT se activan Contratación pública y Competidores." inputMode="numeric" />}
        </form.Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field name="sector">{(field) => <TextField field={field} label="Sector" />}</form.Field>
          <form.Field name="city">{(field) => <TextField field={field} label="Ciudad principal" />}</form.Field>
        </div>
        <form.Field name="activity">{(field) => <AutoTextareaField field={field} label="Actividad" maxChars={600} rows={2} />}</form.Field>
        <form.Field name="competitors">
          {(field) => (
            <CompetitorsEditor
              value={field.state.value}
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
        <form.Field name="currentSituation">{(field) => <AutoTextareaField field={field} label="Situación actual" maxChars={1000} />}</form.Field>
        <form.Field name="target">{(field) => <AutoTextareaField field={field} label="Meta" maxChars={1000} />}</form.Field>
        <form.Field name="priorities">{(field) => <ChipListField field={field} label="Prioridades" placeholder="Escriba una prioridad" />}</form.Field>
      </section>

      <StepActions busy={busy} submitLabel={submitLabel} onBack={onBack} />
    </form>
  );
}
