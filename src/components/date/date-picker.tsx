"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { bogotaDateKey } from "@/core/time/bogota";
import { dateToKey, keyToDate } from "./day-keys";
import { PresetList } from "./preset-list";
import { datePresets, type DateDirection } from "./presets";

interface Props {
  /** Day key `YYYY-MM-DD`, or undefined when no day is chosen. */
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  /** Id for the trigger, so a `FieldLabel` can point at it. */
  id?: string;
  /** Visible label text. The button is named "label: value", so a screen reader hears both. */
  label?: string;
  placeholder?: string;
  /** `past` offers hoy / ayer / hace una semana...; `future` offers hoy / mañana / en una semana... */
  direction?: DateDirection;
  /** Shows a "Quitar fecha" button, for optional fields. */
  clearable?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  /** Today as a Bogota day key. Only tests need to pass it. */
  today?: string;
}

/** Single-day picker: a button that opens the ReUI calendar-15 layout (shortcuts plus calendar), in Spanish. */
export function DatePicker({
  value,
  onChange,
  id,
  label,
  placeholder = "Elegir fecha",
  direction = "past",
  clearable = false,
  disabled,
  invalid,
  today: todayProp,
}: Props) {
  const [open, setOpen] = useState(false);
  const [currentDay] = useState(() => bogotaDateKey(new Date()));
  const today = todayProp ?? currentDay;
  const selected = value ? keyToDate(value) : undefined;
  const todayDate = keyToDate(today);
  const [month, setMonth] = useState(selected ?? todayDate);

  const text = selected ? format(selected, "d 'de' MMMM 'de' yyyy", { locale: es }) : placeholder;

  const pick = (key: string) => {
    onChange(key);
    setMonth(keyToDate(key));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            aria-label={label ? `${label}: ${text}` : undefined}
            variant="outline"
            disabled={disabled}
            aria-invalid={invalid ? true : undefined}
            className="w-full justify-start font-normal"
          />
        }
      >
        <CalendarIcon aria-hidden="true" data-icon="inline-start" />
        <span className={selected ? undefined : "text-muted-foreground"}>
          {text}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto max-w-[calc(100vw-1rem)] gap-0 p-0">
        <div className="flex max-sm:flex-col">
          <PresetList
            label="Atajos"
            className="sm:w-40"
            items={datePresets(today, direction).map((preset) => ({
              id: preset.label,
              label: preset.label,
              active: preset.value === value,
              onSelect: () => pick(preset.value),
            }))}
          />
          <Calendar
            mode="single"
            locale={es}
            month={month}
            onMonthChange={setMonth}
            selected={selected}
            disabled={direction === "future" ? { before: todayDate } : { after: todayDate }}
            onSelect={(next) => next && pick(dateToKey(next))}
          />
        </div>
        {clearable && value && (
          <div className="flex justify-end border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
            >
              Quitar fecha
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
