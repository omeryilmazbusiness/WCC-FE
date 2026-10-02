"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeftRight, Search } from "lucide-react";
import type { FlightRepository } from "@/entities/flight";
import { cn } from "@/shared/lib/cn";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui";
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
import { PassengerPicker } from "./passenger-picker";
import { PlaceCombobox } from "./place-combobox";

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
      className="space-y-4 rounded-[28px] border border-zinc-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.03)] sm:p-5"
      data-testid="flight-search-form"
      aria-label={t("title")}
    >
      <div className="grid items-start gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
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
        <div className="flex justify-center md:pt-[26px]">
          <button
            type="button"
            onClick={() => setForm(swapPlaces)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200/80 bg-white text-zinc-600 shadow-sm transition-all hover:-translate-y-0.5 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            aria-label={t("swap")}
            title={t("swap")}
            data-testid="flight-swap"
          >
            <ArrowLeftRight className="h-4 w-4 rotate-90 md:rotate-0" aria-hidden />
          </button>
        </div>
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
      </div>

      <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,0.7fr)_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="flight-date">{t("date")}</Label>
          <Input
            id="flight-date"
            type="date"
            min={today}
            max={addDays(today, MAX_ADVANCE_DAYS)}
            value={form.date}
            onChange={(e) => patch({ date: e.target.value })}
            aria-invalid={errors.date ? true : undefined}
            className={cn(errors.date && "border-rose-300")}
            data-testid="flight-date"
          />
          {errors.date ? <p className="text-xs font-medium text-rose-600">{message("date", errors.date)}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="flight-time">{t("time")}</Label>
          <Input
            id="flight-time"
            type="time"
            step={900}
            value={form.time}
            onChange={(e) => patch({ time: e.target.value })}
            aria-invalid={errors.time ? true : undefined}
            className={cn(errors.time && "border-rose-300")}
            data-testid="flight-time"
          />
          {errors.time ? (
            <p className="text-xs font-medium text-rose-600">{message("time", errors.time)}</p>
          ) : (
            <p className="text-xs text-zinc-500">{t("timeHint")}</p>
          )}
        </div>
        <PassengerPicker
          id="flight-passengers"
          value={form.passengers}
          onChange={(passengers) => patch({ passengers })}
          error={message("passengers", errors.passengers)}
        />
        <div className="space-y-1.5">
          <Label htmlFor="flight-currency">{t("currency")}</Label>
          <Select value={form.currency} onValueChange={(v) => isFlightCurrency(v) && patch({ currency: v })}>
            <SelectTrigger id="flight-currency" data-testid="flight-currency">
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
        </div>
        <div className="flex items-end sm:col-span-2 lg:col-span-1 lg:pt-[26px]">
          <Button type="submit" className="w-full lg:w-auto" disabled={busy} data-testid="flight-search-submit">
            <Search className="h-4 w-4" aria-hidden />
            {t("submit")}
          </Button>
        </div>
      </div>

      <label className="inline-flex cursor-pointer select-none items-center gap-2.5 text-sm font-medium text-zinc-700">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={form.direct}
          onChange={(e) => patch({ direct: e.target.checked })}
          data-testid="flight-direct"
        />
        <span
          aria-hidden
          className="relative h-6 w-10 rounded-full bg-zinc-200 transition-colors after:absolute after:start-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-emerald-500 peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--ring)] rtl:peer-checked:after:-translate-x-4"
        />
        {t("directOnly")}
      </label>
    </form>
  );
}
