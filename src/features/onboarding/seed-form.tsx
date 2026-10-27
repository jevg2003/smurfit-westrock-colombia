"use client";

import { revalidateLogic, useForm } from "@tanstack/react-form";
import { z } from "zod";
import { NitField, TextField } from "@/components/reui/form-fields";
import { citySchema, nameSchema } from "@/core/company/fields";
import { nitOf, optionalNitInputSchema } from "@/core/company/nit";
import type { OnboardingSeed } from "@/core/onboarding/schemas";
import { StepActions } from "./step-actions";
import { StepForm } from "./step-form";

/** Form values keep empty strings so inputs stay controlled; `toSeed` drops them. Every rule is the company's own. */
export const seedFormSchema = z.object({ name: nameSchema, nit: optionalNitInputSchema, city: citySchema });
type SeedValues = z.infer<typeof seedFormSchema>;

const toSeed = (values: SeedValues): OnboardingSeed => {
  const nit = nitOf(values.nit);
  const city = values.city.trim();
  return { name: values.name.trim(), ...(nit ? { nit } : {}), ...(city ? { city } : {}) };
};

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
    <StepForm
      actions={<StepActions busy={busy} />}
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
        {(field) => <NitField field={field} label="NIT" hint="Con el NIT se activan Contratación pública y Competidores." />}
      </form.Field>
      <form.Field name="city">{(field) => <TextField field={field} label="Ciudad principal" autoComplete="address-level2" />}</form.Field>
    </StepForm>
  );
}
