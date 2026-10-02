"use client";

import { useTranslations } from "next-intl";
import { ChevronDown, Minus, Plus, Users } from "lucide-react";
import type { Passengers } from "@/entities/flight";
import { cn } from "@/shared/lib/cn";
import { Label, Popover, PopoverContent, PopoverTrigger } from "@/shared/ui";
import {
  MAX_TRAVELLERS,
  canStep,
  stepPassengers,
  totalTravellers,
  type PassengerKind,
} from "../model/search-form";

const KINDS: readonly PassengerKind[] = ["adults", "children", "infants"];

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
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t("passengers")}</Label>
      <Popover className="flex w-full">
        <PopoverTrigger
          id={id}
          className={cn(
            "flex h-11 w-full items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white px-3.5 text-start text-sm font-medium text-zinc-950 shadow-sm transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
            error && "border-rose-300",
          )}
          aria-invalid={error ? true : undefined}
          data-testid="flight-passengers"
        >
          <Users className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{t("travellers", { count: total })}</span>
          <ChevronDown className="h-4 w-4 text-zinc-400" aria-hidden />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-2" aria-label={t("passengers")}>
          {KINDS.map((kind) => (
            <div key={kind} className="flex items-center justify-between gap-3 rounded-2xl px-2.5 py-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900">{t(`kinds.${kind}.label`)}</p>
                <p className="text-xs text-zinc-500">{t(`kinds.${kind}.hint`)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40"
                  disabled={!canStep(value, kind, -1)}
                  onClick={() => onChange(stepPassengers(value, kind, -1))}
                  aria-label={t("decrease", { kind: t(`kinds.${kind}.label`) })}
                  data-testid={`passengers-${kind}-dec`}
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden />
                </button>
                <output
                  className="w-6 text-center text-sm font-semibold tabular-nums text-zinc-950"
                  aria-live="polite"
                  data-testid={`passengers-${kind}`}
                >
                  {value[kind]}
                </output>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40"
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
          <p className="px-2.5 pb-1 pt-2 text-xs text-zinc-500">{t("passengerRules", { max: MAX_TRAVELLERS })}</p>
        </PopoverContent>
      </Popover>
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
