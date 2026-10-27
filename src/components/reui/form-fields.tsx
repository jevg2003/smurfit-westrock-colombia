"use client"

import type { AnyFieldApi } from "@tanstack/react-form"
import { PlusIcon, XIcon } from "lucide-react"
import { useId, useState, type ClipboardEvent, type ComponentProps, type ReactNode } from "react"
import { NumericFormat } from "react-number-format"
import type { z } from "zod"
import { DatePicker } from "@/components/date/date-picker"
import type { DateDirection } from "@/components/date/presets"
import { Badge } from "@/components/reui/badge"
import { AutoTextarea, CharCounter } from "@/components/reui/auto-textarea"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { NIT_MAX_DIGITS, NIT_MIN_DIGITS, computeNitDv, parseNit } from "@/core/company/nit"
import { fieldMeta, type FieldMeta } from "@/lib/schema-meta"

/**
 * TanStack Form field wrappers shared by every form: one label, hint and error layout. Required marks, limits and
 * counters come from the zod schema the form validates with (`validators.onDynamic`), never from props.
 */
const invalidOf = (field: AnyFieldApi) => !field.state.meta.isValid

/** The schema the form of `field` validates with, when it has one. */
function schemaOf(field: AnyFieldApi): z.ZodType | undefined {
  const validators = field.form.options.validators as Record<string, unknown> | undefined
  for (const key of ["onDynamic", "onSubmit", "onChange", "onBlur"]) {
    const candidate = validators?.[key]
    if (candidate && typeof candidate === "object" && "_zod" in candidate) return candidate as z.ZodType
  }
  return undefined
}

/** Rules of one field, read from the schema of its form. */
export const useFieldMeta = (field: AnyFieldApi, schema?: z.ZodType): FieldMeta => fieldMeta(schema ?? schemaOf(field), field.name)

interface BaseProps {
  field: AnyFieldApi
  label: string
  hint?: string
  /** Keeps the label for assistive technology only (the screen already shows the text). */
  hideLabel?: boolean
  /** Reads the rules from this schema instead of the form schema, for a field whose rules depend on another value. */
  schema?: z.ZodType
}

/** Label with the mark the schema asks for: a star when the field is required, "(opcional)" when it is not. */
function LabelRow({
  htmlFor,
  label,
  hideLabel,
  required,
  children,
}: {
  htmlFor: string
  label: string
  hideLabel?: boolean
  required: boolean
  children?: ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <div className={hideLabel ? "sr-only" : "flex items-baseline gap-1.5"}>
        <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
        {required ? (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        ) : (
          <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
        )}
      </div>
      {children}
    </div>
  )
}

type TextFieldProps = BaseProps &
  Omit<ComponentProps<typeof Input>, "value" | "onChange" | "onBlur" | "id" | "name" | "maxLength" | "required">

export function TextField({ field, label, hint, hideLabel, schema, ...props }: TextFieldProps) {
  const id = useId()
  const invalid = invalidOf(field)
  const meta = useFieldMeta(field, schema)
  return (
    <Field data-invalid={invalid}>
      <LabelRow htmlFor={id} label={label} hideLabel={hideLabel} required={meta.required} />
      <Input
        id={id}
        name={field.name}
        value={field.state.value}
        maxLength={meta.maxLength}
        aria-required={meta.required || undefined}
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

type NumberFieldProps = BaseProps & { unit?: string; onValueChange?(): void }

/**
 * A number typed with the Colombian format (decimal comma; a point is accepted too). The form value is a number
 * (undefined while empty); whole-number and range rules come from the schema.
 */
export function NumberField({ field, label, hint, hideLabel, schema, unit, onValueChange }: NumberFieldProps) {
  const id = useId()
  const invalid = invalidOf(field)
  const meta = useFieldMeta(field, schema)
  return (
    <Field data-invalid={invalid}>
      <LabelRow htmlFor={id} label={label} hideLabel={hideLabel} required={meta.required} />
      <div className="flex items-center gap-2">
        <NumericFormat
          customInput={Input}
          id={id}
          name={field.name}
          value={field.state.value ?? ""}
          decimalSeparator=","
          allowedDecimalSeparators={[",", "."]}
          decimalScale={meta.integer ? 0 : undefined}
          allowNegative={false}
          inputMode={meta.integer ? "numeric" : "decimal"}
          autoComplete="off"
          aria-required={meta.required || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="max-w-32"
          onBlur={field.handleBlur}
          onValueChange={({ floatValue }, { source }) => {
            if (source !== "event") return
            field.handleChange(floatValue)
            onValueChange?.()
          }}
        />
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
      {invalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}

type DateFieldProps = BaseProps & { direction?: DateDirection; clearable?: boolean }

/** A calendar day (`YYYY-MM-DD`, empty for none) picked from a popover; the required mark comes from the schema. */
export function DateField({ field, label, hint, hideLabel, schema, direction, clearable }: DateFieldProps) {
  const id = useId()
  const invalid = invalidOf(field)
  const meta = useFieldMeta(field, schema)
  return (
    <Field data-invalid={invalid}>
      <LabelRow htmlFor={id} label={label} hideLabel={hideLabel} required={meta.required} />
      <DatePicker
        id={id}
        label={label}
        direction={direction}
        clearable={clearable}
        invalid={invalid}
        value={field.state.value || undefined}
        onChange={(next) => field.handleChange(next ?? "")}
      />
      {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
      {invalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}

type NitFieldProps = BaseProps & { placeholder?: string }

/**
 * The NIT of a company: digits only, shown grouped with dots (900.123.456), with the DIAN verification digit
 * computed and shown as a read-only suffix. The form value is the digits; a pasted "900.123.456-7" keeps its
 * "-7" in the value so the schema can reject a digit that does not match.
 */
export function NitField({ field, label, hint, hideLabel, placeholder = "900.123.456" }: NitFieldProps) {
  const id = useId()
  const invalid = invalidOf(field)
  const meta = useFieldMeta(field)
  const { digits } = parseNit(String(field.state.value ?? ""))
  const showDv = digits.length >= NIT_MIN_DIGITS

  return (
    <Field data-invalid={invalid}>
      <LabelRow htmlFor={id} label={label} hideLabel={hideLabel} required={meta.required} />
      <InputGroup>
        <NumericFormat
          customInput={InputGroupInput}
          id={id}
          name={field.name}
          value={digits}
          valueIsNumericString
          thousandSeparator="."
          decimalSeparator=","
          decimalScale={0}
          allowNegative={false}
          allowLeadingZeros
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          isAllowed={({ value }) => value.length <= NIT_MAX_DIGITS}
          aria-required={meta.required || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onBlur={field.handleBlur}
          onValueChange={({ value }, { source }) => {
            if (source === "event" && value !== digits) field.handleChange(value)
          }}
          onPaste={(event: ClipboardEvent<HTMLInputElement>) => {
            const pasted = parseNit(event.clipboardData.getData("text"))
            if (pasted.dv === undefined) return
            event.preventDefault()
            field.handleChange(`${pasted.digits.slice(0, NIT_MAX_DIGITS)}-${pasted.dv}`)
          }}
        />
        {showDv && (
          <InputGroupAddon align="inline-end">
            <InputGroupText className="tabular-nums" title="Dígito de verificación">
              -{computeNitDv(digits)}
            </InputGroupText>
          </InputGroupAddon>
        )}
      </InputGroup>
      {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
      {invalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}

type AutoTextareaFieldProps = BaseProps & {
  placeholder?: string
  rows?: number
  /** An error that does not come from the schema (a store refusing the value); shown while the schema is satisfied. */
  extraError?: string | null
  /** Called whenever the user edits the text, for example to clear `extraError`. */
  onEdit?(): void
}

/** The one free-text field of the app: auto-resize and character counter (ReUI c-textarea-6); the limit is the schema's. */
export function AutoTextareaField({ field, label, hint, hideLabel, schema, extraError, onEdit, ...props }: AutoTextareaFieldProps) {
  const id = useId()
  const invalid = invalidOf(field) || Boolean(extraError)
  const meta = useFieldMeta(field, schema)
  const maxChars = meta.maxLength
  return (
    <Field data-invalid={invalid}>
      <LabelRow htmlFor={id} label={label} hideLabel={hideLabel} required={meta.required}>
        {maxChars !== undefined && <CharCounter length={field.state.value.length} max={maxChars} className="ms-auto" />}
      </LabelRow>
      <AutoTextarea
        id={id}
        name={field.name}
        value={field.state.value}
        maxChars={maxChars}
        aria-required={meta.required || undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onBlur={field.handleBlur}
        onChange={(next) => {
          field.handleChange(next)
          onEdit?.()
        }}
        {...props}
      />
      {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
      {!field.state.meta.isValid ? <FieldError errors={field.state.meta.errors} /> : extraError ? <FieldError>{extraError}</FieldError> : null}
    </Field>
  )
}

type ChipListFieldProps = BaseProps & { placeholder?: string; addLabel?: string }

/** A list of short terms: type one, press Enter or the button, remove with the x on each chip. Limits come from the schema. */
export function ChipListField({ field, label, hint, placeholder, addLabel = "Agregar" }: ChipListFieldProps) {
  const id = useId()
  const [draft, setDraft] = useState("")
  const items: string[] = field.state.value
  const invalid = invalidOf(field)
  const meta = useFieldMeta(field)
  const full = meta.maxItems !== undefined && items.length >= meta.maxItems

  const add = () => {
    const term = draft.trim()
    if (!term || full) return
    if (!items.some((item) => item.toLowerCase() === term.toLowerCase())) field.handleChange([...items, term])
    setDraft("")
  }

  return (
    <Field data-invalid={invalid}>
      <LabelRow htmlFor={id} label={label} required={meta.required}>
        {meta.maxItems !== undefined && <CharCounter length={items.length} max={meta.maxItems} className="ms-auto" />}
      </LabelRow>
      {items.length > 0 && (
        <ul aria-label={`Agregados en ${label}`} className="flex flex-wrap gap-1">
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
          maxLength={meta.itemMaxLength}
          disabled={full}
          aria-invalid={invalid || undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              add()
            }
          }}
        />
        <Button type="button" variant="outline" disabled={full} onClick={add} aria-label={`${addLabel} a ${label}`}>
          <PlusIcon aria-hidden="true" />
          {addLabel}
        </Button>
      </div>
      {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
      {invalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
