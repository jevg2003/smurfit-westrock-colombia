"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useId, useState } from "react";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const titleId = useId();
  const questionId = useId();
  const [template, setTemplate] = useState<DecisionTemplate | null>(null);
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [factors, setFactors] = useState<Pestel[]>([]);
  const [error, setError] = useState<string | null>(null);

  const pick = (item: DecisionTemplate | null) => {
    setTemplate(item);
    setTitle(item?.title ?? "");
    setQuestion(item?.question ?? "");
    setFactors(item?.pestelFactors ?? []);
    setError(null);
  };

  const submit = () => {
    if (title.trim() === "") return setError("Escribe un título para la decisión.");
    const created = create({
      title,
      question,
      pestelFactors: factors,
      options: (template?.optionLabels ?? []).map((label) => ({ label, pros: "", cons: "" })),
    });
    onCreated(created.id);
  };

  return (
    <>
      <SheetHeader className="gap-1 pe-12">
        <SheetTitle>Nueva decisión</SheetTitle>
        <SheetDescription>Parte de una plantilla o de una hoja en blanco. Después puedes editar todo.</SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 px-4">
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
                    <Badge variant="info-light" size="sm">
                      Plantilla
                    </Badge>
                    <span className="font-medium">{item.title}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{item.guide}</span>
                </button>
              </li>
            ))}
          </ul>
          <Button variant="ghost" size="sm" className="self-start" onClick={() => pick(null)}>
            Empezar en blanco
          </Button>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={titleId}>Título</Label>
            <Input
              id={titleId}
              value={title}
              aria-invalid={error ? true : undefined}
              onChange={(event) => {
                setTitle(event.target.value);
                setError(null);
              }}
            />
            {error && (
              <p role="alert" className="text-xs text-destructive-foreground">
                {error}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={questionId}>Pregunta</Label>
            <Textarea id={questionId} rows={3} value={question} onChange={(event) => setQuestion(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Factores PESTEL</Label>
            <FactorPicker value={factors} onChange={setFactors} />
          </div>
        </section>
      </div>

      <SheetFooter className="flex-row justify-end gap-2">
        <Button onClick={submit}>Crear decisión</Button>
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

  const [title, setTitle] = useState(decision.title);
  const [question, setQuestion] = useState(decision.question);
  const [factors, setFactors] = useState<Pestel[]>(decision.pestelFactors);
  const [options, setOptions] = useState<DecisionOption[]>(decision.options);
  const [linked, setLinked] = useState<string[]>(decision.linkedSignalIds);
  const [owner, setOwner] = useState(decision.owner ?? "");
  const [reviewAt, setReviewAt] = useState(decision.reviewAt ?? "");
  const [saved, setSaved] = useState(false);

  const [status, setStatusValue] = useState<DecisionStatus>(decision.status);
  const [rationale, setRationale] = useState(decision.rationale);
  const [chosen, setChosen] = useState<string | undefined>(decision.chosenOption);
  const [statusError, setStatusError] = useState<string | null>(null);

  const liveIds = new Set(signals.map((signal) => signal.id));
  const staleLinked = linked.filter((id) => !liveIds.has(id));
  const needsRationale = status === "decided" || status === "discarded";

  const patchOption = (id: string, patch: Partial<DecisionOption>) =>
    setOptions((current) => current.map((option) => (option.id === id ? { ...option, ...patch } : option)));

  const save = () => {
    update(decision.id, {
      title: title.trim() || decision.title,
      question,
      pestelFactors: factors,
      options,
      linkedSignalIds: linked,
      owner: owner.trim() || undefined,
      reviewAt: reviewAt || undefined,
    });
    setSaved(true);
  };

  const applyStatus = () => {
    // Save the edited options first, so an option that was just added can be the chosen one.
    save();
    const result = setStatus(decision.id, status, { rationale, chosenOption: chosen });
    setStatusError(result.ok ? null : result.error.message);
  };

  return (
    <>
      <SheetHeader className="gap-2 pe-12">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" size="sm">
            {DECISION_STATUS_LABELS[decision.status]}
          </Badge>
          {decision.pestelFactors.map((factor) => (
            <Badge key={factor} variant="outline" size="sm">
              {PESTEL_LABELS[factor]}
            </Badge>
          ))}
        </div>
        <SheetTitle className="text-base leading-snug">{decision.title}</SheetTitle>
        <SheetDescription>Edita la decisión, vincula señales y cambia su estado.</SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 px-4">
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${ids}-title`}>Título</Label>
            <Input id={`${ids}-title`} value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${ids}-question`}>Pregunta</Label>
            <Textarea id={`${ids}-question`} rows={3} value={question} onChange={(event) => setQuestion(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Factores PESTEL</Label>
            <FactorPicker value={factors} onChange={setFactors} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${ids}-owner`}>Responsable (opcional)</Label>
              <Input id={`${ids}-owner`} value={owner} onChange={(event) => setOwner(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${ids}-review`}>Revisar el (opcional)</Label>
              <Input id={`${ids}-review`} type="date" value={reviewAt} onChange={(event) => setReviewAt(event.target.value)} />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-2" aria-label="Opciones">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Opciones</h3>
          {options.length === 0 && (
            <p className="text-sm text-muted-foreground">Aún no hay opciones. Agrega al menos dos para comparar.</p>
          )}
          <ul className="flex flex-col gap-3">
            {options.map((option, index) => (
              <li key={option.id} className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-end gap-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Label htmlFor={`${ids}-o-${option.id}`}>Opción {index + 1}</Label>
                    <Input
                      id={`${ids}-o-${option.id}`}
                      value={option.label}
                      onChange={(event) => patchOption(option.id, { label: event.target.value })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Quitar la opción ${index + 1}`}
                    onClick={() => setOptions((current) => current.filter((item) => item.id !== option.id))}
                  >
                    <Trash2Icon aria-hidden="true" />
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`${ids}-p-${option.id}`}>A favor</Label>
                    <Textarea
                      id={`${ids}-p-${option.id}`}
                      rows={2}
                      value={option.pros}
                      onChange={(event) => patchOption(option.id, { pros: event.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`${ids}-c-${option.id}`}>En contra</Label>
                    <Textarea
                      id={`${ids}-c-${option.id}`}
                      rows={2}
                      value={option.cons}
                      onChange={(event) => patchOption(option.id, { cons: event.target.value })}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Button variant="outline" size="sm" className="self-start" onClick={() => setOptions((current) => [...current, newOption()])}>
            <PlusIcon aria-hidden="true" data-icon="inline-start" />
            Agregar opción
          </Button>
        </section>

        <section className="flex flex-col gap-2" aria-label="Señales vinculadas">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Señales vinculadas</h3>
          {signals.length === 0 && staleLinked.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay señales activas para vincular.</p>
          ) : (
            <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
              {signals.map((signal) => (
                <li key={signal.id} className="flex items-start gap-2">
                  <Checkbox
                    id={`${ids}-s-${signal.id}`}
                    checked={linked.includes(signal.id)}
                    onCheckedChange={(checked) =>
                      setLinked((current) => (checked === true ? [...current, signal.id] : current.filter((id) => id !== signal.id)))
                    }
                  />
                  <Label htmlFor={`${ids}-s-${signal.id}`} className="min-w-0 flex-col items-start gap-0 font-normal">
                    <span className="break-words">{signal.title}</span>
                    <span className="text-xs text-muted-foreground">{PESTEL_LABELS[signal.pestel]}</span>
                  </Label>
                </li>
              ))}
              {staleLinked.map((id) => (
                <li key={id} className="flex items-start gap-2">
                  <Checkbox
                    id={`${ids}-s-${id}`}
                    checked
                    onCheckedChange={() => setLinked((current) => current.filter((item) => item !== id))}
                  />
                  <Label htmlFor={`${ids}-s-${id}`} className="min-w-0 flex-col items-start gap-0 font-normal">
                    <span className="font-mono text-xs break-all">{id}</span>
                    <span className="text-xs text-muted-foreground">Esta señal ya no se activa con los datos de hoy.</span>
                  </Label>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3" aria-label="Estado">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Estado</h3>
          <ToggleGroup
            value={[status]}
            variant="outline"
            size="sm"
            spacing={1}
            className="flex-wrap"
            aria-label="Estado de la decisión"
            onValueChange={(next) => {
              const value = STATUSES.find((item) => item === next[0]);
              if (value) {
                setStatusValue(value);
                setStatusError(null);
              }
            }}
          >
            {STATUSES.map((value) => (
              <ToggleGroupItem key={value} value={value}>
                {DECISION_STATUS_LABELS[value]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {status === "decided" && options.some((option) => option.label.trim() !== "") && (
            <div className="flex flex-col gap-1.5">
              <Label>Opción elegida</Label>
              <ToggleGroup
                value={chosen ? [chosen] : []}
                variant="outline"
                size="sm"
                spacing={1}
                className="flex-wrap"
                aria-label="Opción elegida"
                onValueChange={(next) => setChosen(next[0])}
              >
                {options
                  .filter((option) => option.label.trim() !== "")
                  .map((option) => (
                    <ToggleGroupItem key={option.id} value={option.id}>
                      {option.label}
                    </ToggleGroupItem>
                  ))}
              </ToggleGroup>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${ids}-why`}>{needsRationale ? "Motivo (obligatorio)" : "Motivo (opcional)"}</Label>
            <Textarea
              id={`${ids}-why`}
              rows={3}
              value={rationale}
              aria-invalid={statusError ? true : undefined}
              placeholder="Por ejemplo: la deuda en dólares vence en diciembre"
              onChange={(event) => {
                setRationale(event.target.value);
                setStatusError(null);
              }}
            />
            {statusError && (
              <p role="alert" className="text-xs text-destructive-foreground">
                {statusError}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" className="self-start" onClick={applyStatus}>
            Aplicar estado
          </Button>
        </section>
      </div>

      <SheetFooter className="flex-row flex-wrap justify-between gap-2">
        <Button
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
          <Button onClick={save}>Guardar cambios</Button>
        </div>
      </SheetFooter>
    </>
  );
}
