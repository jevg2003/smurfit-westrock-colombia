"use client"

import { useLayoutEffect, useRef, type ComponentProps } from "react"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

/** Characters used / limit, like the ReUI auto-resize textarea (c-textarea-6). */
export function CharCounter({ length, max, className }: { length: number; max: number; className?: string }) {
  const remaining = max - length
  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        remaining === 0 ? "font-semibold text-destructive" : remaining <= 20 ? "text-warning-foreground" : "text-muted-foreground",
        className
      )}
    >
      {length}/{max}
    </span>
  )
}

type AutoTextareaProps = Omit<ComponentProps<"textarea">, "value" | "onChange" | "maxLength"> & {
  value: string
  onChange: (value: string) => void
  /** Hard limit of characters. */
  maxChars?: number
}

/** Textarea that grows with its content and stops at `maxChars` (ReUI c-textarea-6). */
export function AutoTextarea({ value, onChange, maxChars, className, rows = 2, ...props }: AutoTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const textarea = ref.current
    if (!textarea) return
    textarea.style.height = "auto"
    if (textarea.scrollHeight > 0) textarea.style.height = `${textarea.scrollHeight}px`
  }, [value])

  return (
    <Textarea
      ref={ref}
      value={value}
      rows={rows}
      maxLength={maxChars}
      onChange={(event) => onChange(maxChars === undefined ? event.target.value : event.target.value.slice(0, maxChars))}
      className={cn("resize-none overflow-hidden", className)}
      {...props}
    />
  )
}
