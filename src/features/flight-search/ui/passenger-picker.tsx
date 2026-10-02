"use client";

import { useTranslations } from "next-intl";
import { Baby, ChevronDown, Minus, Plus, User, UserRound, Users, type LucideIcon } from "lucide-react";
import type { Passengers } from "@/entities/flight";
import { IconTile, Popover, PopoverContent, PopoverTrigger, type Tone } from "@/shared/ui";
import {
  MAX_TRAVELLERS,
  canStep,
  stepPassengers,
  totalTravellers,
  type PassengerKind,
} from "../model/search-form";
import { FieldShell } from "./field-shell";

const KINDS: readonly { kind: PassengerKind; icon: LucideIcon; tone: Tone }[] = [
  { kind: "adults", icon: User, tone: "sky" },
  { kind: "children", icon: UserRound, tone: "violet" },
  { kind: "infants", icon: Baby, tone: "rose" },
];

const STEP =
  "inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-700 ring-1 ring-zinc-200 transition-all hover:bg-zinc-50 hover:text-zinc-950 active:scale-95 disabled:pointer-events-none disabled:opacity-35 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300";

type PassengerPickerProps = {
  id: string;
  value: Passengers;
  onChange: (value: Passengers) => void;
  error?: string;
};

export function PassengerPicker({ id, value, onChange, error }: PassengerPickerProps) {
  const t = useTranslations("flights.form");
  const total = totalTravellers(value);

  return (
    <FieldShell htmlFor={id} label={t("passengers")} icon={Users} tone="amber" error={error}>
      <Popover className="flex w-full">
        <PopoverTrigger
          id={id}
          className="flex h-8 w-full items-center gap-2 text-start text-[15px] font-semibold text-zinc-950 focus:outline-none"
          aria-invalid={error ? true : undefined}
          data-testid="flight-passengers"
        >
          <span className="min-w-0 flex-1 truncate">{t("travellers", { count: total })}</span>
          <ChevronDown className="h-4 w-4 text-zinc-400" aria-hidden />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 rounded-[22px] p-2" aria-label={t("passengers")}>
          {KINDS.map(({ kind, icon, tone }) => (
            <div key={kind} className="flex items-center justify-between gap-3 rounded-2xl px-2.5 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <IconTile icon={icon} tone={tone} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">{t(`kinds.${kind}.label`)}</p>
                  <p className="text-xs text-zinc-500">{t(`kinds.${kind}.hint`)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-zinc-100/80 p-1">
                <button
                  type="button"
                  className={STEP}
                  disabled={!canStep(value, kind, -1)}
                  onClick={() => onChange(stepPassengers(value, kind, -1))}
                  aria-label={t("decrease", { kind: t(`kinds.${kind}.label`) })}
                  data-testid={`passengers-${kind}-dec`}
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden />
                </button>
                <output
                  className="w-6 text-center text-sm font-bold tabular-nums text-zinc-950"
                  aria-live="polite"
                  data-testid={`passengers-${kind}`}
                >
                  {value[kind]}
                </output>
                <button
                  type="button"
                  className={STEP}
                  disabled={!canStep(value, kind, 1)}
                  onClick={() => onChange(stepPassengers(value, kind, 1))}
                  aria-label={t("increase", { kind: t(`kinds.${kind}.label`) })}
                  data-testid={`passengers-${kind}-inc`}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>
          ))}
          <p className="mx-2.5 mt-1 border-t border-zinc-100 pb-1 pt-2.5 text-xs text-zinc-500">
            {t("passengerRules", { max: MAX_TRAVELLERS })}
          </p>
        </PopoverContent>
      </Popover>
    </FieldShell>
  );
}
