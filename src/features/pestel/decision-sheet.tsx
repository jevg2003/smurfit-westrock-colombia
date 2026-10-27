"use client";

import { revalidateLogic, useForm, useStore } from "@tanstack/react-form";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useId, useState } from "react";
import { DatePicker } from "@/components/date/date-picker";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Decision, DecisionOption, DecisionStatus } from "@/core/domain/decision";
import type { Pestel } from "@/core/domain/dimension";
import type { Signal } from "@/core/domain/signal";
import { DECISION_STATUS_LABELS } from "@/core/labels";
import { PESTEL_ORDER } from "@/core/usecases/build-pestel";
import { PESTEL_LABELS } from "@/features/entorno/labels";
import { useDecisionsStore } from "@/stores/decisions.store";
import { createDecisionSchema, detailsSchema, statusSchema, type DetailsValues, type StatusValues } from "./decision-schemas";
import { DECISION_TEMPLATES, type DecisionTemplate } from "./decision-templates";

const STATUSES: readonly DecisionStatus[] = ["open", "evaluating", "decided", "discarded"];

/** `null` is closed, `"new"` is the create form, an id opens that decision. */
export type SheetTarget = string | null;

export const NEW_DECISION = "new";

interface Props {
  target: SheetTarget;
  signals: readonly Signal[];
  onTargetChange: (target: SheetTarget) => void;
}

export function DecisionSheet({ target, signals, onTargetChange }: Props) {
  const decision = useDecisionsStore((state) => state.decisions.find((item) => item.id === target));

  return (
    <Sheet open={target !== null} onOpenChange={(open) => !open && onTargetChange(null)}>
      <SheetContent className="overflow-y-auto sm:max-w-2xl">
        {target === NEW_DECISION && <CreateForm onCreated={onTargetChange} />}
        {decision && (
          <EditForm key={decision.id} decision={decision} signals={signals} onClose={() => onTargetChange(null)} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function FactorPicker({ value, onChange }: { value: Pestel[]; onChange: (value: Pestel[]) => void }) {
  return (
    <ToggleGroup
      multiple
      value={value}
      variant="outline"
      size="sm"
      spacing={1}
      className="flex-wrap"
      aria-label="Factores PESTEL"
      onValueChange={(next) => onChange(PESTEL_ORDER.filter((factor) => next.includes(factor)))}
    >
      {PESTEL_ORDER.map((factor) => (
        <ToggleGroupItem key={factor} value={factor}>
          {PESTEL_LABELS[factor]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function CreateForm({ onCreated }: { onCreated: (id: string) => void }) {
  const create = useDecisionsStore((state) => state.create);
  const formId = useId();
  const [template, setTemplate] = useState<DecisionTemplate | null>(null);

  const defaultValues: { title: string; question: string; factors: Pestel[] } = { title: "", question: "", factors: [] };
  const form = useForm({
    defaultValues,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: createDecisionSchema },
    onSubmit: ({ value }) => {
      const created = create({
        title: value.title,
        question: value.question,
        pestelFactors: value.factors,
        options: (template?.optionLabels ?? []).map((label) => ({ label, pros: "", cons: "" })),
      });
      onCreated(created.id);
    },
  });

  const pick = (item: DecisionTemplate | null) => {
    setTemplate(item);
    form.setFieldValue("title", item?.title ?? "");
    form.setFieldValue("question", item?.question ?? "");
    form.setFieldValue("factors", item?.pestelFactors ?? []);
  };

  return (
    <>
      <SheetHeader className="gap-1 pe-12">
        <SheetTitle>Nueva decisión</SheetTitle>
        <SheetDescription>Parte de una plantilla o de una hoja en blanco. Después puedes editar todo.</SheetDescription>
      </SheetHeader>

      <form
        id={formId}
        noValidate
        className="flex flex-1 flex-col gap-5 px-4"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <section className="flex flex-col gap-2" aria-label="Plantillas">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Plantillas</h3>
          <p className="text-xs text-muted-foreground">
            Las plantillas son ejemplos escritos a partir del contexto de la empresa. No son datos ni recomendaciones.
          </p>
          <ul className="flex flex-col gap-2">
            {DECISION_TEMPLATES.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={template?.id === item.id}
                  onClick={() => pick(item)}
                  className="flex w-full min-w-0 flex-col gap-1 rounded-lg border p-3 text-start text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-primary"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge variant="info-light">
                      Plantilla
                    </Badge>
                    <span className="font-medium">{item.title}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{item.guide}</span>
                </button>
              </li>
            ))}
          </ul>
          <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => pick(null)}>
            Empezar en blanco
          </Button>
        </section>

        <section className="flex flex-col gap-3">
          <form.Field name="title">
            {(field) => {
              const invalid = !field.state.meta.isValid;
              return (
                <Field data-invalid={invalid}>
                  <FieldLabel htmlFor={`${formId}-title`}>Título</FieldLabel>
                  <Input
                    id={`${formId}-title`}
                    value={field.state.value}
                    aria-invalid={invalid || undefined}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                  {invalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
          <form.Field name="question">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={`${formId}-question`}>Pregunta</FieldLabel>
                <Textarea
                  id={`${formId}-question`}
                  rows={3}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </Field>
            )}
          </form.Field>
          <form.Field name="factors">
            {(field) => (
              <Field>
                <FieldLabel>Factores PESTEL</FieldLabel>
                <FactorPicker value={field.state.value} onChange={field.handleChange} />
              </Field>
            )}
          </form.Field>
        </section>
      </form>

      <SheetFooter className="flex-row justify-end gap-2">
        <Button type="submit" form={formId}>
          Crear decisión
        </Button>
      </SheetFooter>
    </>
  );
}

const newOption = (): DecisionOption => ({ id: globalThis.crypto.randomUUID(), label: "", pros: "", cons: "" });

function EditForm({ decision, signals, onClose }: { decision: Decision; signals: readonly Signal[]; onClose: () => void }) {
  const update = useDecisionsStore((state) => state.update);
  const setStatus = useDecisionsStore((state) => state.setStatus);
  const remove = useDecisionsStore((state) => state.remove);
  const ids = useId();
  const [saved, setSaved] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);

  const liveIds = new Set(signals.map((signal) => signal.id));

  const persist = (value: DetailsValues) => {
    update(decision.id, {
      title: value.title.trim() || decision.title,
      question: value.question,
      pestelFactors: value.factors,
      options: value.options,
      linkedSignalIds: value.linked,
      owner: value.owner.trim() || undefined,
      reviewAt: value.reviewAt || undefined,
    });
    setSaved(true);
  };

  const detailsDefaults: DetailsValues = {
    title: decision.title,
    question: decision.question,
    factors: decision.pestelFactors,
    options: decision.options,
    linked: decision.linkedSignalIds,
    owner: decision.owner ?? "",
    reviewAt: decision.reviewAt ?? "",
  };
  const details = useForm({
    defaultValues: detailsDefaults,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: detailsSchema },
    onSubmit: ({ value }) => persist(value),
  });

  const statusDefaults: StatusValues = { status: decision.status, rationale: decision.rationale, chosen: decision.chosenOption };
  const statusForm = useForm({
    defaultValues: statusDefaults,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: statusSchema },
    onSubmit: ({ value }) => {
      // Save the edited options first, so an option that was just added can be the chosen one.
      persist(details.state.values);
      const result = setStatus(decision.id, value.status, { rationale: value.rationale, chosenOption: value.chosen });
      setStoreError(result.ok ? null : result.error.message);
    },
  });

  const options = useStore(details.store, (state) => state.values.options);
  const linked = useStore(details.store, (state) => state.values.linked);
  const staleLinked = linked.filter((id) => !liveIds.has(id));

  const stop = (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <>
      <SheetHeader className="gap-2 pe-12">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">
            {DECISION_STATUS_LABELS[decision.status]}
          </Badge>
          {decision.pestelFactors.map((factor) => (
            <Badge key={factor} variant="outline">
              {PESTEL_LABELS[factor]}
            </Badge>
          ))}
        </div>
        <SheetTitle className="text-base leading-snug">{decision.title}</SheetTitle>
        <SheetDescription>Edita la decisión, vincula avisos y cambia su estado.</SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 px-4">
        <form
          id={`${ids}-details`}
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            stop(event);
            void details.handleSubmit();
          }}
        >
          <section className="flex flex-col gap-3">
            <details.Field name="title">
              {(field) => {
                const invalid = !field.state.meta.isValid;
                return (
                  <Field data-invalid={invalid}>
                    <FieldLabel htmlFor={`${ids}-title`}>Título</FieldLabel>
                    <Input
                      id={`${ids}-title`}
                      value={field.state.value}
                      aria-invalid={invalid || undefined}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                    {invalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            </details.Field>
            <details.Field name="question">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={`${ids}-question`}>Pregunta</FieldLabel>
                  <Textarea
                    id={`${ids}-question`}
                    rows={3}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                </Field>
              )}
            </details.Field>
            <details.Field name="factors">
              {(field) => (
                <Field>
                  <FieldLabel>Factores PESTEL</FieldLabel>
                  <FactorPicker value={field.state.value} onChange={field.handleChange} />
                </Field>
              )}
            </details.Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <details.Field name="owner">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={`${ids}-owner`}>Responsable (opcional)</FieldLabel>
                    <Input
                      id={`${ids}-owner`}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                  </Field>
                )}
              </details.Field>
              <details.Field name="reviewAt">
                {(field) => {
                  const invalid = !field.state.meta.isValid;
                  return (
                    <Field data-invalid={invalid}>
                      <FieldLabel htmlFor={`${ids}-review`}>
                        Revisar el (opcional)
                      </FieldLabel>
                      <DatePicker
                        id={`${ids}-review`}
                        label="Revisar el (opcional)"
                        direction="future"
                        clearable
                        invalid={invalid}
                        value={field.state.value || undefined}
                        onChange={(next) => field.handleChange(next ?? "")}
                      />
                      {invalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              </details.Field>
            </div>
          </section>

          <section className="flex flex-col gap-2" aria-label="Opciones">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Opciones</h3>
            <details.Field name="options" mode="array">
              {(optionsField) => (
                <>
                  {optionsField.state.value.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aún no hay opciones. Agregue al menos dos para comparar.</p>
                  )}
                  <ul className="flex flex-col gap-3">
                    {optionsField.state.value.map((option, index) => (
                      <li key={option.id} className="flex flex-col gap-2 rounded-lg border p-3">
                        <div className="flex items-end gap-2">
                          <details.Field name={`options[${index}].label`}>
                            {(field) => (
                              <Field className="min-w-0 flex-1">
                                <FieldLabel htmlFor={`${ids}-o-${option.id}`}>Opción {index + 1}</FieldLabel>
                                <Input
                                  id={`${ids}-o-${option.id}`}
                                  value={field.state.value}
                                  onBlur={field.handleBlur}
                                  onChange={(event) => field.handleChange(event.target.value)}
                                />
                              </Field>
                            )}
                          </details.Field>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Quitar la opción ${index + 1}`}
                            onClick={() => optionsField.removeValue(index)}
                          >
                            <Trash2Icon aria-hidden="true" />
                          </Button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <details.Field name={`options[${index}].pros`}>
                            {(field) => (
                              <Field>
                                <FieldLabel htmlFor={`${ids}-p-${option.id}`}>A favor</FieldLabel>
                                <Textarea
                                  id={`${ids}-p-${option.id}`}
                                  rows={2}
                                  value={field.state.value}
                                  onBlur={field.handleBlur}
                                  onChange={(event) => field.handleChange(event.target.value)}
                                />
                              </Field>
                            )}
                          </details.Field>
                          <details.Field name={`options[${index}].cons`}>
                            {(field) => (
                              <Field>
                                <FieldLabel htmlFor={`${ids}-c-${option.id}`}>En contra</FieldLabel>
                                <Textarea
                                  id={`${ids}-c-${option.id}`}
                                  rows={2}
                                  value={field.state.value}
                                  onBlur={field.handleBlur}
                                  onChange={(event) => field.handleChange(event.target.value)}
                                />
                              </Field>
                            )}
                          </details.Field>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => optionsField.pushValue(newOption())}>
                    <PlusIcon aria-hidden="true" data-icon="inline-start" />
                    Agregar opción
                  </Button>
                </>
              )}
            </details.Field>
          </section>

          <section className="flex flex-col gap-2" aria-label="Avisos vinculados">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Avisos vinculados</h3>
            {signals.length === 0 && staleLinked.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay avisos activos para vincular.</p>
            ) : (
              <details.Field name="linked">
                {(field) => (
                  <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
                    {signals.map((signal) => (
                      <li key={signal.id}>
                        <Field orientation="horizontal" className="items-start">
                          <Checkbox
                            id={`${ids}-s-${signal.id}`}
                            checked={field.state.value.includes(signal.id)}
                            onCheckedChange={(checked) =>
                              field.handleChange(
                                checked === true ? [...field.state.value, signal.id] : field.state.value.filter((id) => id !== signal.id),
                              )
                            }
                          />
                          <FieldLabel htmlFor={`${ids}-s-${signal.id}`} className="min-w-0 flex-col items-start gap-0 font-normal">
                            <span className="break-words">{signal.title}</span>
                            <span className="text-xs text-muted-foreground">{PESTEL_LABELS[signal.pestel]}</span>
                          </FieldLabel>
                        </Field>
                      </li>
                    ))}
                    {staleLinked.map((id) => (
                      <li key={id}>
                        <Field orientation="horizontal" className="items-start">
                          <Checkbox
                            id={`${ids}-s-${id}`}
                            checked
                            onCheckedChange={() => field.handleChange(field.state.value.filter((item) => item !== id))}
                          />
                          <FieldLabel htmlFor={`${ids}-s-${id}`} className="min-w-0 flex-col items-start gap-0 font-normal">
                            <span className="font-mono text-xs break-all">{id}</span>
                            <span className="text-xs text-muted-foreground">Este aviso ya no se activa con los datos de hoy.</span>
                          </FieldLabel>
                        </Field>
                      </li>
                    ))}
                  </ul>
                )}
              </details.Field>
            )}
          </section>
        </form>

        <form
          noValidate
          aria-label="Estado de la decisión"
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            stop(event);
            void statusForm.handleSubmit();
          }}
        >
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Estado</h3>
          <statusForm.Field name="status">
            {(field) => (
              <ToggleGroup
                value={[field.state.value]}
                variant="outline"
                size="sm"
                spacing={1}
                className="flex-wrap"
                aria-label="Estado de la decisión"
                onValueChange={(next) => {
                  const value = STATUSES.find((item) => item === next[0]);
                  if (value) {
                    field.handleChange(value);
                    setStoreError(null);
                  }
                }}
              >
                {STATUSES.map((value) => (
                  <ToggleGroupItem key={value} value={value}>
                    {DECISION_STATUS_LABELS[value]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          </statusForm.Field>

          <statusForm.Subscribe selector={(state) => state.values.status}>
            {(status) => (
              <>
                {status === "decided" && options.some((option) => option.label.trim() !== "") && (
                  <statusForm.Field name="chosen">
                    {(field) => (
                      <Field>
                        <FieldLabel>Opción elegida</FieldLabel>
                        <ToggleGroup
                          value={field.state.value ? [field.state.value] : []}
                          variant="outline"
                          size="sm"
                          spacing={1}
                          className="flex-wrap"
                          aria-label="Opción elegida"
                          onValueChange={(next) => field.handleChange(next[0])}
                        >
                          {options
                            .filter((option) => option.label.trim() !== "")
                            .map((option) => (
                              <ToggleGroupItem key={option.id} value={option.id}>
                                {option.label}
                              </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                      </Field>
                    )}
                  </statusForm.Field>
                )}

                <statusForm.Field name="rationale">
                  {(field) => {
                    const invalid = !field.state.meta.isValid || storeError !== null;
                    return (
                      <Field data-invalid={invalid}>
                        <FieldLabel htmlFor={`${ids}-why`}>
                          {status === "decided" || status === "discarded" ? "Motivo (obligatorio)" : "Motivo (opcional)"}
                        </FieldLabel>
                        <Textarea
                          id={`${ids}-why`}
                          rows={3}
                          value={field.state.value}
                          aria-invalid={invalid || undefined}
                          placeholder="Por ejemplo: la deuda en dólares vence en diciembre"
                          onBlur={field.handleBlur}
                          onChange={(event) => {
                            field.handleChange(event.target.value);
                            setStoreError(null);
                          }}
                        />
                        {!field.state.meta.isValid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : (
                          storeError && <FieldError>{storeError}</FieldError>
                        )}
                      </Field>
                    );
                  }}
                </statusForm.Field>
              </>
            )}
          </statusForm.Subscribe>
          <Button type="submit" variant="outline" size="sm" className="self-start">
            Aplicar estado
          </Button>
        </form>
      </div>

      <SheetFooter className="flex-row flex-wrap justify-between gap-2">
        <Button
          type="button"
          variant="destructive"
          onClick={() => {
            remove(decision.id);
            onClose();
          }}
        >
          Eliminar
        </Button>
        <div className="flex items-center gap-2">
          {saved && (
            <span role="status" className="text-xs text-muted-foreground">
              Guardado
            </span>
          )}
          <Button type="submit" form={`${ids}-details`}>
            Guardar cambios
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}
