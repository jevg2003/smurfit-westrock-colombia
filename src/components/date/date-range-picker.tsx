"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { bogotaDateKey } from "@/core/time/bogota";
import { dateToKey, keyToDate, type DayRange } from "./day-keys";
import { PresetList } from "./preset-list";
import { matchRangePreset, rangePresets } from "./presets";

export type { DayRange } from "./day-keys";

interface Props {
  /** Accessible name and prefix of the trigger, for example "Período". */
  label: string;
  value: DayRange | undefined;
  onChange: (value: DayRange | undefined) => void;
  id?: string;
  placeholder?: string;
  /** Today as a Bogota day key. Only tests need to pass it. */
  today?: string;
}

const short = (key: string) => format(keyToDate(key), "d MMM yyyy", { locale: es });

/** Period picker: week / 7 days / month / 12 months shortcuts or a custom range, on the calendar-15 layout. */
export function DateRangePicker({ label, value, onChange, id, placeholder = "Elegir período", today = bogotaDateKey(new Date()) }: Props) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  // While the user is picking the second day of a custom range, the first one lives here.
  const [draft, setDraft] = useState<DateRange | undefined>();
  const [month, setMonth] = useState(() => keyToDate(value?.toDate ?? today));
  const todayDate = keyToDate(today);
  const activePreset = custom ? undefined : matchRangePreset(value, today);

  const apply = (range: DayRange) => {
    onChange(range);
    setMonth(keyToDate(range.toDate));
    setDraft(undefined);
    setCustom(false);
    setOpen(false);
  };

  const selected: DateRange | undefined =
    draft ?? (value ? { from: keyToDate(value.fromDate), to: keyToDate(value.toDate) } : undefined);

  const text = value ? `${short(value.fromDate)} – ${short(value.toDate)}` : placeholder;

  return (
    <Popover
      open={open}
      onOpenChange={(next, details) => {
        // The calendar re-creates its day buttons on every render, so a click on a day lands on a
        // node that is already detached and would count as an outside press. Ignore that one.
        const target = details?.event?.target;
        if (!next && details?.reason === "outside-press" && target instanceof Node && !target.isConnected) return;
        setOpen(next);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            aria-label={`${label}: ${text}`}
            className="w-full justify-start font-normal sm:w-auto"
          />
        }
      >
        <CalendarIcon aria-hidden="true" data-icon="inline-start" />
        <span className={value ? undefined : "text-muted-foreground"}>{text}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto max-w-[calc(100vw-1rem)] gap-0 p-0">
        <div className="flex max-sm:flex-col">
          <PresetList
            label="Atajos de período"
            className="sm:w-48"
            items={[
              ...rangePresets(today).map((preset) => ({
                id: preset.id,
                label: preset.label,
                active: activePreset === preset.id,
                onSelect: () => apply(preset.range),
              })),
              {
                id: "custom",
                label: "Personalizado",
                active: custom,
                onSelect: () => {
                  setCustom(true);
                  setDraft(undefined);
                },
              },
            ]}
          />
          <Calendar
            mode="range"
            locale={es}
            month={month}
            onMonthChange={setMonth}
            selected={selected}
            disabled={{ after: todayDate }}
            onSelect={(_next, picked) => {
              // Two clicks make a range: the first starts a draft, the second closes it.
              if (!draft?.from) {
                setCustom(true);
                return setDraft({ from: picked, to: undefined });
              }
              const [from, to] = [draft.from, picked].sort((a, b) => a.getTime() - b.getTime());
              apply({ fromDate: dateToKey(from as Date), toDate: dateToKey(to as Date) });
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
