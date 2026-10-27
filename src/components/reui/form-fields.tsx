"use client"

import type { AnyFieldApi } from "@tanstack/react-form"
import { Fragment, useId, useRef, useState, type ClipboardEvent, type ComponentProps, type ReactNode } from "react"
import { NumericFormat } from "react-number-format"
import type { z } from "zod"
import { DatePicker } from "@/components/date/date-picker"
import type { DateDirection } from "@/components/date/presets"
import { AutoTextarea, CharCounter } from "@/components/reui/auto-textarea"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox"
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

type ChipListFieldProps = BaseProps & {
  placeholder?: string
  /** Ready-made terms offered in the list; anything else the user types can still be added. */
  suggestions?: string[]
  /** Kept for existing callers; adding is done with Enter, the "Agregar" row of the list, or by pasting. */
  addLabel?: string
}

/** Splits pasted text into terms on commas, semicolons and new lines. */
const splitTerms = (text: string) =>
  text
    .split(/[,;\n\r]+/)
    .map((term) => term.trim())
    .filter(Boolean)

const segmentsOfName = (name: string) => name.split(/[.[\]]+/).filter(Boolean)

/** Copy of `source` with `value` stored at the dotted path of a field name. */
function withValueAt(source: unknown, path: string, value: unknown): unknown {
  const root: Record<string, unknown> = structuredClone((source ?? {}) as Record<string, unknown>)
  const segments = segmentsOfName(path)
  let node = root
  for (const segment of segments.slice(0, -1)) node = node[segment] as Record<string, unknown>
  node[segments[segments.length - 1]] = value
  return root
}

/** The schema message that complains about `next` as the value of `field`, or undefined when the schema accepts it. */
function refusalOf(field: AnyFieldApi, next: string[], schema?: z.ZodType): string | undefined {
  const rules = schema ?? schemaOf(field)
  if (!rules) return undefined
  const parsed = rules.safeParse(withValueAt(field.form.state.values, field.name, next))
  if (parsed.success) return undefined
  const own = segmentsOfName(field.name)
  const issue = parsed.error.issues.find((entry) => own.every((segment, index) => String(entry.path[index]) === segment))
  return issue?.message
}

/**
 * A list of short terms as pills (ReUI c-combobox-20): type one and press Enter, pick a suggestion, or paste
 * several separated by commas or new lines. Item count, item length and the required mark come from the schema.
 */
export function ChipListField({ field, label, hint, hideLabel, schema, placeholder, suggestions = [] }: ChipListFieldProps) {
  const id = useId()
  const anchor = useComboboxAnchor()
  const [draft, setDraft] = useState("")
  const [refusal, setRefusal] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const highlighted = useRef<string | null>(null)
  const items: string[] = field.state.value
  const invalid = invalidOf(field)
  const meta = useFieldMeta(field, schema)
  const term = draft.trim()

  /** Adds terms one by one, stopping at the first one the schema refuses; duplicates are skipped. */
  const addTerms = (terms: string[]) => {
    let next = items
    for (const candidate of terms) {
      if (next.some((item) => item.toLowerCase() === candidate.toLowerCase())) continue
      const attempt = [...next, candidate]
      const message = refusalOf(field, attempt, schema)
      if (message) {
        setRefusal(message)
        break
      }
      next = attempt
    }
    if (next !== items) {
      setRefusal(null)
      field.handleChange(next)
    }
    setDraft("")
  }

  const offered = suggestions.filter((suggestion) => suggestion.toLowerCase().includes(term.toLowerCase()))
  const creatable = term !== "" && ![...suggestions, ...items].some((item) => item.toLowerCase() === term.toLowerCase())
  const options = creatable ? [term, ...offered] : offered

  return (
    <Field data-invalid={invalid || Boolean(refusal)}>
      <LabelRow htmlFor={id} label={label} hideLabel={hideLabel} required={meta.required}>
        {meta.maxItems !== undefined && <CharCounter length={items.length} max={meta.maxItems} className="ms-auto" />}
      </LabelRow>
      <Combobox
        multiple
        items={options}
        value={items}
        inputValue={draft}
        filter={null}
        open={open && options.length > 0}
        onOpenChange={setOpen}
        onInputValueChange={(next, details) => {
          setDraft(next)
          if (details.reason === "input-change") setRefusal(null)
        }}
        onItemHighlighted={(item) => {
          highlighted.current = (item as string | undefined) ?? null
        }}
        onValueChange={(next: string[]) => {
          if (next.length < items.length) {
            setRefusal(null)
            field.handleChange(next)
          } else {
            addTerms(next.filter((value) => !items.includes(value)))
          }
        }}
      >
        <ComboboxChips ref={anchor} aria-label={`Agregados en ${label}`} className="border-none bg-transparent p-0 shadow-none ring-0 focus-within:ring-0 dark:bg-transparent">
          <ComboboxValue>
            {(selected: string[]) => (
              <Fragment>
                {selected.map((item) => (
                  <ComboboxChip
                    key={item}
                    removeLabel={`Quitar ${item}`}
                    className="inline-flex h-auto items-center gap-1.5 rounded-full border bg-background py-0.5 pl-2.5 shadow-xs **:data-[slot=combobox-chip-remove]:mr-0.5 **:data-[slot=combobox-chip-remove]:bg-transparent"
                  >
                    {item}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput
                  id={id}
                  name={field.name}
                  placeholder={placeholder}
                  aria-required={meta.required || undefined}
                  aria-invalid={invalid || Boolean(refusal) || undefined}
                  aria-describedby={hint ? `${id}-hint` : undefined}
                  className="rounded-lg border border-input bg-transparent px-2.5 py-1 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30"
                  onBlur={field.handleBlur}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return
                    event.preventDefault()
                    // An option the user moved to is chosen by the list itself; otherwise Enter adds what was typed.
                    if (highlighted.current === null && term) addTerms([term])
                  }}
                  onPaste={(event) => {
                    const terms = splitTerms(event.clipboardData.getData("text"))
                    if (terms.length < 2) return
                    event.preventDefault()
                    addTerms(terms)
                  }}
                />
              </Fragment>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor} className="max-w-(--anchor-width) min-w-(--anchor-width)">
          <ComboboxEmpty>Sin sugerencias</ComboboxEmpty>
          <ComboboxList>
            {(option: string) => (
              <ComboboxItem key={option} value={option}>
                {creatable && option === term ? `Agregar «${option}»` : option}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
      {refusal ? <FieldError>{refusal}</FieldError> : invalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
