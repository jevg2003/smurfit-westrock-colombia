"use client";

import { revalidateLogic, useForm } from "@tanstack/react-form";
import { z } from "zod";
import { TextField } from "@/components/reui/form-fields";
import type { OnboardingSeed } from "@/core/onboarding/schemas";
import { StepActions } from "./step-actions";

export const NIT_ERROR = "El NIT lleva solo dígitos, sin puntos ni guion, entre 5 y 12.";

/** Form values keep empty strings so inputs stay controlled; `toSeed` drops them. */
export const seedFormSchema = z.object({
  name: z.string().trim().min(1, "Escriba el nombre de la empresa.").max(120, "Use 120 caracteres como máximo."),
  nit: z.string().trim().regex(/^(\d{5,12})?$/, NIT_ERROR),
  city: z.string().trim().max(80, "Use 80 caracteres como máximo."),
});
type SeedValues = z.infer<typeof seedFormSchema>;

const toSeed = (values: SeedValues): OnboardingSeed => ({
  name: values.name.trim(),
  ...(values.nit.trim() ? { nit: values.nit.trim() } : {}),
  ...(values.city.trim() ? { city: values.city.trim() } : {}),
});

interface SeedFormProps {
  seed: OnboardingSeed | null;
  busy: boolean;
  onSubmit(seed: OnboardingSeed): void;
}

/** First step: the only fields every company must give. The name is required; NIT and city are not. */
export function SeedForm({ seed, busy, onSubmit }: SeedFormProps) {
  const defaultValues: SeedValues = { name: seed?.name ?? "", nit: seed?.nit ?? "", city: seed?.city ?? "" };
  const form = useForm({
    defaultValues,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: seedFormSchema },
    onSubmit: ({ value }) => onSubmit(toSeed(value)),
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">Datos de la empresa</h2>
        <p className="text-xs text-muted-foreground">Con esto preparamos las primeras preguntas.</p>
      </div>
      <form.Field name="name">{(field) => <TextField field={field} label="Nombre de la empresa" autoComplete="organization" />}</form.Field>
      <form.Field name="nit">
        {(field) => (
          <TextField
            field={field}
            label="NIT (opcional)"
            hint="Con el NIT se activan Contratación pública y Competidores."
            inputMode="numeric"
            autoComplete="off"
            placeholder="900123456"
          />
        )}
      </form.Field>
      <form.Field name="city">{(field) => <TextField field={field} label="Ciudad principal" autoComplete="address-level2" />}</form.Field>
      <StepActions busy={busy} />
    </form>
  );
}
