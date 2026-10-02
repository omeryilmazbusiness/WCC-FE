"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeftRight, CalendarDays, Clock3, Coins, Loader2, Route, Search } from "lucide-react";
import type { FlightRepository } from "@/entities/flight";
import { cn } from "@/shared/lib/cn";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, buttonVariants } from "@/shared/ui";
import {
  FLIGHT_CURRENCIES,
  MAX_ADVANCE_DAYS,
  MAX_TRAVELLERS,
  addDays,
  hasErrors,
  isFlightCurrency,
  swapPlaces,
  validateForm,
  type FlightSearchForm as FormValues,
  type FormErrorCode,
  type FormField,
} from "../model/search-form";
import { DatePicker } from "./date-picker";
import { FIELD_CONTROL, FieldShell } from "./field-shell";
import { PassengerPicker } from "./passenger-picker";
import { PlaceCombobox } from "./place-combobox";
import { TimePicker } from "./time-picker";

type FlightSearchFormProps = {
  initial: FormValues;
  today: string;
  repository: FlightRepository;
  busy?: boolean;
  onSubmit: (form: FormValues) => void;
};

/** From / to, wanted departure (origin local time), travellers, currency and non-stop. */
export function FlightSearchForm({ initial, today, repository, busy, onSubmit }: FlightSearchFormProps) {
  const t = useTranslations("flights.form");
  const locale = useLocale();
  const [form, setForm] = useState(initial);
  const [attempted, setAttempted] = useState(false);
  const errors = attempted ? validateForm(form, today) : {};

  const message = (field: FormField, code: FormErrorCode | undefined) =>
    code ? t(`errors.${field}.${code}`, { max: MAX_TRAVELLERS, days: MAX_ADVANCE_DAYS }) : undefined;

  function patch(next: Partial<FormValues>) {
    setForm((f) => ({ ...f, ...next }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (hasErrors(validateForm(form, today))) return;
    onSubmit(form);
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      className="relative z-10 space-y-3 rounded-[30px] border border-white/80 bg-white/90 p-3 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.35)] ring-1 ring-zinc-200/60 backdrop-blur-xl sm:p-4"
      data-testid="flight-search-form"
      aria-label={t("title")}
    >
      <div className="relative grid items-start gap-3 md:grid-cols-2">
        <PlaceCombobox
          id="flight-origin"
          label={t("from")}
          placeholder={t("fromPlaceholder")}
          value={form.origin}
          onChange={(origin) => patch({ origin })}
          repository={repository}
          locale={locale}
          icon="takeoff"
          error={message("origin", errors.origin)}
        />
        <PlaceCombobox
          id="flight-destination"
          label={t("to")}
          placeholder={t("toPlaceholder")}
          value={form.destination}
          onChange={(destination) => patch({ destination })}
          repository={repository}
          locale={locale}
          icon="landing"
          error={message("destination", errors.destination)}
        />
        <button
          type="button"
          onClick={() => setForm(swapPlaces)}
          className="group absolute start-1/2 top-[22px] z-10 hidden h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-white text-zinc-600 shadow-[0_10px_24px_-12px_rgba(15,23,42,0.45)] ring-1 ring-zinc-200/80 transition-all duration-300 hover:text-sky-600 hover:shadow-[0_14px_28px_-12px_rgba(14,165,233,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 active:scale-95 md:inline-flex rtl:translate-x-1/2"
          aria-label={t("swap")}
          title={t("swap")}
          data-testid="flight-swap"
        >
          <ArrowLeftRight className="h-4 w-4 transition-transform duration-500 group-hover:rotate-180" aria-hidden />
        </button>
      </div>

      <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
        <FieldShell
          htmlFor="flight-date"
          label={t("date")}
          icon={CalendarDays}
          tone="sky"
          error={message("date", errors.date)}
        >
          <DatePicker
            id="flight-date"
            value={form.date}
            min={today}
            max={addDays(today, MAX_ADVANCE_DAYS)}
            locale={locale}
            invalid={Boolean(errors.date)}
            onChange={(date) => patch({ date })}
          />
        </FieldShell>
        <FieldShell
          htmlFor="flight-time"
          label={t("time")}
          icon={Clock3}
          tone="violet"
          hint={form.time ? t("timeHint") : t("timeOptional")}
          error={message("time", errors.time)}
        >
          <TimePicker
            id="flight-time"
            value={form.time}
            invalid={Boolean(errors.time)}
            onChange={(time) => patch({ time })}
          />
        </FieldShell>
        <PassengerPicker
          id="flight-passengers"
          value={form.passengers}
          onChange={(passengers) => patch({ passengers })}
          error={message("passengers", errors.passengers)}
        />
        <FieldShell htmlFor="flight-currency" label={t("currency")} icon={Coins} tone="emerald">
          <Select value={form.currency} onValueChange={(v) => isFlightCurrency(v) && patch({ currency: v })}>
            <SelectTrigger id="flight-currency" className={cn(FIELD_CONTROL, "w-full")} data-testid="flight-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FLIGHT_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldShell>
      </div>

      <div className="flex flex-col gap-3 px-1 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer select-none items-center gap-3 rounded-full bg-zinc-50/80 py-1.5 pe-4 ps-1.5 text-sm font-semibold text-zinc-700 ring-1 ring-inset ring-zinc-200/70">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={form.direct}
              onChange={(e) => patch({ direct: e.target.checked })}
              data-testid="flight-direct"
            />
            <span
              aria-hidden
              className="relative h-[26px] w-[44px] shrink-0 rounded-full bg-zinc-300/80 transition-colors duration-300 after:absolute after:start-[3px] after:top-[3px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-[0_2px_6px_rgba(0,0,0,0.25)] after:transition-transform after:duration-300 peer-checked:bg-[#34C759] peer-checked:after:translate-x-[18px] peer-focus-visible:ring-2 peer-focus-visible:ring-sky-300 rtl:peer-checked:after:-translate-x-[18px]"
            />
            <Route className="h-4 w-4 text-zinc-400" aria-hidden />
            {t("directOnly")}
          </label>
          <button
            type="button"
            onClick={() => setForm(swapPlaces)}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-zinc-50/80 px-3.5 text-sm font-semibold text-zinc-600 ring-1 ring-inset ring-zinc-200/70 transition-colors hover:text-sky-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 md:hidden"
            aria-label={t("swap")}
          >
            <ArrowLeftRight className="h-4 w-4 rotate-90" aria-hidden />
          </button>
        </div>
        <button
          type="submit"
          disabled={busy}
          className={buttonVariants({
            size: "lg",
            className:
              "w-full rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 px-8 text-white shadow-[0_16px_32px_-14px_rgba(79,70,229,0.7)] hover:bg-transparent hover:from-sky-400 hover:to-indigo-500 hover:shadow-[0_20px_36px_-14px_rgba(79,70,229,0.75)] sm:w-auto",
          })}
          data-testid="flight-search-submit"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
          {t("submit")}
        </button>
      </div>
    </form>
  );
}
