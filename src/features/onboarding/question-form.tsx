"use client";

import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useId, useMemo } from "react";
import { AutoTextareaField } from "@/components/reui/form-fields";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldError, FieldLabel, FieldTitle } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { OTHER_CHOICE, OTHER_LABEL, answerFormSchema, initialAnswerValues, toAnswer } from "@/core/onboarding/answer-form";
import type { Answer, Question } from "@/core/onboarding/schemas";
import { canSkip, skipAnswerFor } from "@/core/onboarding/skip";
import { StepActions } from "./step-actions";
import { StepForm } from "./step-form";

interface QuestionFormProps {
  question: Question;
  /** The answer saved before, when the user comes back to this question. */
  answer?: Answer;
  busy: boolean;
  onSubmit(answer: Answer): void;
  onBack(): void;
}

/** One AI question: single choice, multiple choice or open text, with its reason. Skipping is offered only the first time. */
export function QuestionForm({ question, answer, busy, onSubmit, onBack }: QuestionFormProps) {
  const headingId = useId();
  const schema = useMemo(() => answerFormSchema(question), [question]);
  const form = useForm({
    defaultValues: initialAnswerValues(question, answer),
    validationLogic: revalidateLogic(),
    validators: { onDynamic: schema },
    onSubmit: ({ value }) => onSubmit(toAnswer(question, value)),
  });
  const options = [...(question.options ?? []), ...(question.allowOther ? [OTHER_CHOICE] : [])];
  const labelOf = (option: string) => (option === OTHER_CHOICE ? OTHER_LABEL : option);
  // A question that already has an answer (given or skipped) cannot be skipped when the user comes back to it.
  const skip = () => {
    const skipped = skipAnswerFor(question, answer);
    if (skipped) onSubmit(skipped);
  };

  return (
    <StepForm
      actions={<StepActions busy={busy} onBack={onBack} onSkip={canSkip(answer) ? skip : undefined} />}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="text-lg font-semibold tracking-tight">
          {question.prompt}
        </h2>
        <p className="text-xs text-muted-foreground">Por qué lo preguntamos: {question.why}</p>
      </div>

      {question.kind === "text" ? (
        <form.Field name="text">
          {(field) => <AutoTextareaField field={field} label={question.prompt} hideLabel rows={3} />}
        </form.Field>
      ) : (
        <>
          <form.Field name="choices">
            {(field) => {
              const chosen: string[] = field.state.value;
              const invalid = !field.state.meta.isValid;
              return (
                <Field data-invalid={invalid}>
                  {question.kind === "single" ? (
                    <RadioGroup aria-labelledby={headingId} value={chosen[0] ?? ""} onValueChange={(value) => field.handleChange([String(value)])}>
                      {options.map((option) => (
                        <FieldLabel key={option}>
                          <Field orientation="horizontal">
                            <RadioGroupItem value={option} />
                            <FieldContent>
                              <FieldTitle>{labelOf(option)}</FieldTitle>
                            </FieldContent>
                          </Field>
                        </FieldLabel>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div role="group" aria-labelledby={headingId} className="grid gap-2">
                      {options.map((option) => (
                        <FieldLabel key={option}>
                          <Field orientation="horizontal">
                            <Checkbox
                              checked={chosen.includes(option)}
                              onCheckedChange={(checked) => field.handleChange(checked ? [...chosen, option] : chosen.filter((item) => item !== option))}
                            />
                            <FieldContent>
                              <FieldTitle>{labelOf(option)}</FieldTitle>
                            </FieldContent>
                          </Field>
                        </FieldLabel>
                      ))}
                    </div>
                  )}
                  {invalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>

          <form.Subscribe selector={(state) => state.values.choices.includes(OTHER_CHOICE)}>
            {(usesOther) =>
              usesOther && (
                <form.Field name="text">
                  {(field) => <AutoTextareaField field={field} label="Otra respuesta" />}
                </form.Field>
              )
            }
          </form.Subscribe>
        </>
      )}

    </StepForm>
  );
}
