"use client";

import { revalidateLogic, useForm, useStore } from "@tanstack/react-form";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/reui/badge";
import { AutoTextareaField, ChipListField, NitField, TextField, useFieldMeta } from "@/components/reui/form-fields";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { NEWS_GROUP_IDS, NEWS_GROUP_LABELS } from "@/core/company/profile";
import { confirmFormSchema, type ConfirmValues } from "@/core/onboarding/confirm";
import { CompetitorDialog, type Competitor } from "./competitor-dialog";
import { CompetitorList } from "./competitor-list";
import { ConfirmSection } from "./confirm-section";
import { StepActions } from "./step-actions";
import { FormIssues, StepForm } from "./step-form";

type DialogState = { mode: "add" } | { mode: "edit"; competitor: Competitor } | null;

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

interface CompetitorsSectionProps {
  /** The `competitors` field of the confirm form; its limit comes from the form schema. */
  field: Parameters<typeof useFieldMeta>[0];
  /** Keeps the company news group in step with the competitors: `from` leaves it, `to` joins it. */
  onNamesChange(from: string | undefined, to: string | undefined): void;
}

/** Competitors as a list of rows, with a dialog to add or edit one (name and optional NIT). */
function CompetitorsSection({ field, onNamesChange }: CompetitorsSectionProps) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const competitors: Competitor[] = field.state.value;
  const meta = useFieldMeta(field);
  const full = meta.maxItems !== undefined && competitors.length >= meta.maxItems;
  const editing = dialog?.mode === "edit" ? dialog.competitor : undefined;

  return (
    <ConfirmSection
      title="Competidores"
      description="Con su nombre se siguen sus noticias; con el NIT, sus contratos."
      schema={confirmFormSchema}
      paths={["competitors"]}
      action={
        <div className="flex items-center gap-2">
          <Badge variant="outline" size="sm">
            {competitors.length === 1 ? "1 competidor" : `${competitors.length} competidores`}
          </Badge>
          <Button type="button" variant="outline" size="sm" disabled={full} onClick={() => setDialog({ mode: "add" })}>
            <PlusIcon aria-hidden="true" data-icon="inline-start" />
            Agregar competidor
          </Button>
        </div>
      }
    >
      <CompetitorList
        competitors={competitors}
        onEdit={(competitor) => setDialog({ mode: "edit", competitor })}
        onRemove={(competitor) => {
          field.handleChange(competitors.filter((item) => item.name !== competitor.name));
          onNamesChange(competitor.name, undefined);
        }}
      />
      <CompetitorDialog
        key={editing?.name ?? "new"}
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        initial={editing}
        onSubmit={(next) => {
          // A name that is already listed (other than the one being edited) is not added twice.
          if (competitors.some((item) => item.name !== editing?.name && sameName(item.name, next.name))) return;
          field.handleChange(editing ? competitors.map((item) => (item.name === editing.name ? next : item)) : [...competitors, next]);
          onNamesChange(editing?.name, next.name);
        }}
      />
    </ConfirmSection>
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
  /** Settings mode: the actions show only while there are changes, and after a save the saved values become the baseline. */
  dirtyOnly?: boolean;
  onBack?(): void;
  /** Return false when the save failed, so the changes stay pending. */
  onSubmit(values: ConfirmValues): void | boolean;
}

/** Where an issue without a field of its own points at, in the words of the form. */
function issueLabel(path: readonly PropertyKey[]): string | undefined {
  const [head, group] = path;
  if (head === "newsGroups" && typeof group === "string") return NEWS_GROUP_LABELS[group as keyof typeof NEWS_GROUP_LABELS];
  const labels: Record<string, string> = { regulationKeywords: "Palabras de regulación", priorities: "Prioridades", competitors: "Competidores" };
  return typeof head === "string" ? labels[head] : undefined;
}

/** The whole company profile as one editable form: the last onboarding step and the Empresa tab of Configuración. */
export function ConfirmForm({ defaultValues, busy = false, submitLabel, intro, embedded = false, dirtyOnly = false, onBack, onSubmit }: ConfirmFormProps) {
  const form = useForm({
    defaultValues,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: confirmFormSchema },
    onSubmit: ({ value }) => {
      const saved = onSubmit(value);
      // The saved values are the new baseline, so the actions go away until the next edit.
      if (dirtyOnly && saved !== false) form.reset(value);
    },
  });
  const unchanged = useStore(form.store, (state) => state.isDefaultValue);

  /** The company news group follows the competitors by name, so a rename or removal updates its term too. */
  const swapCompanyTerm = (from: string | undefined, to: string | undefined) => {
    const current: string[] = form.getFieldValue("newsGroups.company");
    const kept = from ? current.filter((term) => !sameName(term, from)) : current;
    const next = to && !kept.some((term) => sameName(term, to)) ? [...kept, to] : kept;
    form.setFieldValue("newsGroups.company", next);
  };

  const title = intro?.title ?? "Revise la configuración";
  const content = (
    <fieldset className="flex flex-col gap-6">
      <legend className="sr-only">{title}</legend>

      <ConfirmSection title="Empresa" description="Los datos con los que se identifica su empresa." schema={confirmFormSchema} paths={["name", "nit", "sector", "city"]}>
        <FieldGroup className="gap-4 md:grid md:grid-cols-2">
          <form.Field name="name">{(field) => <TextField field={field} label="Nombre de la empresa" />}</form.Field>
          <form.Field name="nit">
            {(field) => <NitField field={field} label="NIT" hint="Con el NIT se activan Contratación pública y Competidores." />}
          </form.Field>
          <form.Field name="sector">{(field) => <TextField field={field} label="Sector" />}</form.Field>
          <form.Field name="city">{(field) => <TextField field={field} label="Ciudad principal" />}</form.Field>
        </FieldGroup>
      </ConfirmSection>

      <Separator />

      <ConfirmSection title="Actividad" description="Qué hace la empresa; orienta lo que se busca para usted." schema={confirmFormSchema} paths={["activity"]}>
        <form.Field name="activity">{(field) => <AutoTextareaField field={field} label="Actividad" rows={2} />}</form.Field>
      </ConfirmSection>

      <Separator />

      <form.Field name="competitors">{(field) => <CompetitorsSection field={field} onNamesChange={swapCompanyTerm} />}</form.Field>

      <Separator />

      <ConfirmSection
        title="Búsqueda"
        description="Los términos con los que se rastrean noticias y decretos."
        schema={confirmFormSchema}
        paths={[...NEWS_GROUP_IDS.map((id) => `newsGroups.${id}`), "regulationKeywords"]}
      >
        <FieldGroup className="gap-4">
          {NEWS_GROUP_IDS.map((groupId) => (
            <form.Field key={groupId} name={`newsGroups.${groupId}`}>
              {(field) => <ChipListField field={field} label={NEWS_GROUP_LABELS[groupId]} placeholder="Escriba un término" />}
            </form.Field>
          ))}
          <form.Field name="regulationKeywords">
            {(field) => <ChipListField field={field} label="Palabras de regulación" placeholder="Escriba una palabra" hint="Filtran los decretos que ve la empresa." />}
          </form.Field>
        </FieldGroup>
      </ConfirmSection>

      <Separator />

      <ConfirmSection
        title="Objetivos"
        description="Dónde está hoy la empresa y qué quiere lograr."
        schema={confirmFormSchema}
        paths={["currentSituation", "target", "priorities"]}
      >
        <FieldGroup className="gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <form.Field name="currentSituation">{(field) => <AutoTextareaField field={field} label="Situación actual" />}</form.Field>
            <form.Field name="target">{(field) => <AutoTextareaField field={field} label="Meta" />}</form.Field>
          </div>
          <form.Field name="priorities">{(field) => <ChipListField field={field} label="Prioridades" placeholder="Escriba una prioridad" />}</form.Field>
        </FieldGroup>
      </ConfirmSection>
    </fieldset>
  );

  return (
    <StepForm
      inset={!embedded}
      contentClassName="gap-6"
      actions={
        dirtyOnly && unchanged ? null : (
          <div className="flex flex-col gap-3">
            <FormIssues form={form} schema={confirmFormSchema} labelOf={issueLabel} />
            <div className="flex items-center justify-between gap-3">
              {!dirtyOnly && <p className="hidden min-w-0 flex-1 text-xs text-muted-foreground md:block">Puede cambiar todo esto después en Configuración.</p>}
              <div className={dirtyOnly ? "ml-auto shrink-0 max-md:w-full" : "shrink-0 max-md:w-full"}>
                <StepActions busy={busy} submitLabel={submitLabel} onBack={dirtyOnly ? () => form.reset() : onBack} backLabel={dirtyOnly ? "Descartar" : undefined} />
              </div>
            </div>
          </div>
        )
      }
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      {embedded ? (
        content
      ) : (
        <Card>
          <CardHeader className="border-b">
            <CardTitle role="heading" aria-level={2}>
              {title}
            </CardTitle>
            <CardDescription>{intro?.description ?? "Revise lo que preparamos. Puede cambiarlo ahora o después en Configuración."}</CardDescription>
            <CardAction>
              <Badge variant="warning-light" size="sm">
                Borrador
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>{content}</CardContent>
        </Card>
      )}
    </StepForm>
  );
}
