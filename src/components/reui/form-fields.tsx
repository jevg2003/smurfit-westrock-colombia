"use client"

import type { AnyFieldApi } from "@tanstack/react-form"
import { PlusIcon, XIcon } from "lucide-react"
import { useId, useState, type ComponentProps } from "react"
import { Badge } from "@/components/reui/badge"
import { AutoTextarea, CharCounter } from "@/components/reui/auto-textarea"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

/** TanStack Form field wrappers shared by every form: one label, hint and error layout. */
const invalidOf = (field: AnyFieldApi) => !field.state.meta.isValid

interface BaseProps {
  field: AnyFieldApi
  label: string
  hint?: string
  /** Keeps the label for assistive technology only (the screen already shows the text). */
  hideLabel?: boolean
}

type TextFieldProps = BaseProps & Omit<ComponentProps<typeof Input>, "value" | "onChange" | "onBlur" | "id" | "name">

export function TextField({ field, label, hint, hideLabel, ...props }: TextFieldProps) {
  const id = useId()
  const invalid = invalidOf(field)
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </FieldLabel>
      <Input
        id={id}
        name={field.name}
        value={field.state.value}
        aria-invalid={invalid || undefined}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        {...props}
      />
      {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
      {invalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}

type AutoTextareaFieldProps = BaseProps & { maxChars: number; placeholder?: string; rows?: number }

/** The one free-text field of the app: auto-resize and character counter (ReUI c-textarea-6). */
export function AutoTextareaField({ field, label, hint, hideLabel, maxChars, ...props }: AutoTextareaFieldProps) {
  const id = useId()
  const invalid = invalidOf(field)
  return (
    <Field data-invalid={invalid}>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={id} className={hideLabel ? "sr-only" : undefined}>
          {label}
        </FieldLabel>
        <CharCounter length={field.state.value.length} max={maxChars} className="ms-auto" />
      </div>
      <AutoTextarea
        id={id}
        name={field.name}
        value={field.state.value}
        maxChars={maxChars}
        aria-invalid={invalid || undefined}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onBlur={field.handleBlur}
        onChange={field.handleChange}
        {...props}
      />
      {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
      {invalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}

type ChipListFieldProps = BaseProps & { placeholder?: string; addLabel?: string }

/** A list of short terms: type one, press Enter or the button, remove with the x on each chip. */
export function ChipListField({ field, label, hint, placeholder, addLabel = "Agregar" }: ChipListFieldProps) {
  const id = useId()
  const [draft, setDraft] = useState("")
  const items: string[] = field.state.value

  const add = () => {
    const term = draft.trim()
    if (!term) return
    if (!items.some((item) => item.toLowerCase() === term.toLowerCase())) field.handleChange([...items, term])
    setDraft("")
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {items.length > 0 && (
        <ul aria-label={label} className="flex flex-wrap gap-1">
          {items.map((item) => (
            <li key={item}>
              <Badge variant="outline" className="gap-1 pe-0.5">
                {item}
                <button
                  type="button"
                  aria-label={`Quitar ${item}`}
                  onClick={() => field.handleChange(items.filter((other) => other !== item))}
                  className="inline-flex size-4 items-center justify-center rounded-full outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <XIcon className="size-3" aria-hidden="true" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          placeholder={placeholder}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              add()
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add} aria-label={`${addLabel} a ${label}`}>
          <PlusIcon aria-hidden="true" />
          {addLabel}
        </Button>
      </div>
      {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
    </Field>
  )
}
