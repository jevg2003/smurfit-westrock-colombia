"use client";

import { revalidateLogic, useForm } from "@tanstack/react-form";
import { PlusIcon, SaveIcon } from "lucide-react";
import { Badge } from "@/components/reui/badge";
import { NitField, TextField } from "@/components/reui/form-fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { nitOf } from "@/core/company/nit";
import { competitorSchema, type ConfirmValues } from "@/core/onboarding/confirm";

export type Competitor = ConfirmValues["competitors"][number];

interface CompetitorDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  /** The competitor being edited; absent when adding a new one. */
  initial?: Competitor;
  onSubmit(competitor: Competitor): void;
}

/** The small form inside the dialog. It mounts with the content, so every opening starts from `initial`. */
function CompetitorForm({ initial, onSubmit }: Pick<CompetitorDialogProps, "initial" | "onSubmit">) {
  const editing = Boolean(initial);
  const form = useForm({
    defaultValues: { name: initial?.name ?? "", nit: initial?.nit ?? "" },
    validationLogic: revalidateLogic({ mode: "change", modeAfterSubmission: "change" }),
    validators: { onDynamic: competitorSchema },
    onSubmit: ({ value }) => onSubmit({ name: value.name.trim(), nit: nitOf(value.nit) ?? "" }),
  });

  return (
    <form
      noValidate
      className="contents"
      onSubmit={(event) => {
        event.preventDefault();
        // The dialog is portaled but React still bubbles to the confirm form: keep it from submitting too.
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <DialogHeader>
        <div className="flex items-center gap-2">
          <DialogTitle>{editing ? "Editar competidor" : "Agregar competidor"}</DialogTitle>
          <Badge variant="warning-light" size="sm">
            Mejora la vigilancia
          </Badge>
        </div>
        <DialogDescription>Solo escriba el NIT si lo conoce: con él se consultan sus contratos.</DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <form.Field name="name">{(field) => <TextField field={field} label="Nombre del competidor" autoComplete="off" />}</form.Field>
        <form.Field name="nit">{(field) => <NitField field={field} label="NIT del competidor" />}</form.Field>
      </FieldGroup>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
        {/* Valid is read from the same schema, so the button never disagrees with the submit. */}
        <form.Subscribe selector={(state) => competitorSchema.safeParse(state.values).success}>
          {(valid) => (
            <Button type="submit" disabled={!valid}>
              {editing ? <SaveIcon aria-hidden="true" data-icon="inline-start" /> : <PlusIcon aria-hidden="true" data-icon="inline-start" />}
              {editing ? "Guardar" : "Agregar"}
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  );
}

/** Adds or edits one competitor with the same name and NIT rules as the rest of the confirm form. */
export function CompetitorDialog({ open, onOpenChange, initial, onSubmit }: CompetitorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <CompetitorForm
          initial={initial}
          onSubmit={(competitor) => {
            onSubmit(competitor);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
