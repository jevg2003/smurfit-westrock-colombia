"use client";

import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useId } from "react";
import { AutoTextareaField } from "@/components/reui/form-fields";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldError, FieldLabel, FieldTitle } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { OTHER_CHOICE, OTHER_LABEL, OTHER_MAX_CHARS, answerFormSchema, initialAnswerValues, skippedAnswer, toAnswer } from "@/core/onboarding/answer-form";
import type { Answer, Question } from "@/core/onboarding/schemas";
import { StepActions } from "./step-actions";

interface QuestionFormProps {
  question: Question;
  /** The answer saved before, when the user comes back to this question. */
  answer?: Answer;
  busy: boolean;
  onSubmit(answer: Answer): void;
  onBack(): void;
}

const DEFAULT_TEXT_CHARS = 400;

/** One AI question: single choice, multiple choice or open text, with its reason and a way to skip. */
export function QuestionForm({ question, answer, busy, onSubmit, onBack }: QuestionFormProps) {
  const headingId = useId();
  const form = useForm({
    defaultValues: initialAnswerValues(question, answer),
    validationLogic: revalidateLogic(),
    validators: { onDynamic: answerFormSchema(question) },
    onSubmit: ({ value }) => onSubmit(toAnswer(question, value)),
  });
  const options = [...(question.options ?? []), ...(question.allowOther ? [OTHER_CHOICE] : [])];
  const labelOf = (option: string) => (option === OTHER_CHOICE ? OTHER_LABEL : option);

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
        <h2 id={headingId} className="text-lg font-semibold tracking-tight">
          {question.prompt}
        </h2>
        <p className="text-xs text-muted-foreground">Por qué lo preguntamos: {question.why}</p>
      </div>

      {question.kind === "text" ? (
        <form.Field name="text">
          {(field) => <AutoTextareaField field={field} label={question.prompt} hideLabel maxChars={question.maxChars ?? DEFAULT_TEXT_CHARS} rows={3} />}
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
                  {(field) => <AutoTextareaField field={field} label="Otra respuesta" maxChars={OTHER_MAX_CHARS} />}
                </form.Field>
              )
            }
          </form.Subscribe>
        </>
      )}

      <StepActions busy={busy} onBack={onBack} onSkip={() => onSubmit(skippedAnswer(question))} />
    </form>
  );
}
