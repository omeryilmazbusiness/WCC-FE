"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Building2, Loader2, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { PLACE_MIN_TERM, type FlightRepository, type Place } from "@/entities/flight";
import { cn } from "@/shared/lib/cn";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { Input } from "@/shared/ui";
import type { PlaceChoice } from "../model/search-form";
import { FIELD_CONTROL, FieldShell } from "./field-shell";

const DEBOUNCE_MS = 250;

export function placeLabel(place: Place): string {
  if (place.type === "airport" && place.cityName && place.cityName !== place.name) {
    return `${place.name}, ${place.cityName}`;
  }
  return place.name;
}

type PlaceComboboxProps = {
  id: string;
  label: string;
  placeholder: string;
  value: PlaceChoice | null;
  onChange: (value: PlaceChoice | null) => void;
  repository: FlightRepository;
  locale: string;
  icon?: "takeoff" | "landing";
  error?: string;
};

const display = (v: PlaceChoice | null) => (!v ? "" : v.label === v.code ? v.code : `${v.label} (${v.code})`);

/**
 * City / airport picker (WAI-ARIA combobox): debounced suggestions, arrow keys, Enter and
 * Escape. A bare IATA code is accepted when suggestions are unavailable.
 */
export function PlaceCombobox({
  id,
  label,
  placeholder,
  value,
  onChange,
  repository,
  locale,
  icon = "takeoff",
  error,
}: PlaceComboboxProps) {
  const t = useTranslations("flights.form");
  const listId = useId();
  const errorId = useId();
  const [text, setText] = useState(() => display(value));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const editing = useRef(false);

  // Follow outside changes (swap, URL navigation) unless the user is typing.
  useEffect(() => {
    if (!editing.current) setText(display(value));
  }, [value]);

  const term = text.trim();
  const debounced = useDebouncedValue(term, DEBOUNCE_MS);

  useEffect(() => {
    if (!open || debounced.length < PLACE_MIN_TERM || (value && debounced === display(value))) {
      setPlaces([]);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    setFailed(false);
    repository
      .places(debounced, locale, ctrl.signal)
      .then((next) => {
        if (ctrl.signal.aborted) return;
        setPlaces(next);
        setActive(next.length ? 0 : -1);
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        setPlaces([]);
        setFailed(true);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [debounced, open, locale, repository, value]);

  function choose(place: Place) {
    const next = { code: place.code, label: placeLabel(place) };
    editing.current = false;
    setText(display(next));
    setOpen(false);
    setPlaces([]);
    onChange(next);
  }

  function commitTyped() {
    editing.current = false;
    setOpen(false);
    if (value && text === display(value)) return;
    const code = term.toUpperCase();
    if (/^[A-Z]{3}$/.test(code)) {
      const match = places.find((p) => p.code === code);
      if (match) return choose(match);
      const next = { code, label: code };
      setText(display(next));
      onChange(next);
      return;
    }
    if (!term) onChange(null);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      if (places.length) setActive((i) => (i + 1) % places.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (places.length) setActive((i) => (i <= 0 ? places.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (open && active >= 0 && places[active]) {
        e.preventDefault();
        choose(places[active]);
      } else if (open) {
        commitTyped();
      }
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  }

  const showList = open && term.length >= PLACE_MIN_TERM && (places.length > 0 || loading || failed || debounced === term);
  const landing = icon === "landing";

  return (
    <div className="relative">
      <FieldShell
        htmlFor={id}
        label={label}
        icon={landing ? PlaneLanding : PlaneTakeoff}
        tone={landing ? "indigo" : "sky"}
        error={error}
        errorId={errorId}
      >
        <div className="relative">
          <Input
            id={id}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={listId}
            aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            value={text}
            className={cn(FIELD_CONTROL, "truncate text-base", loading && "pe-7")}
            onFocus={(e) => {
              e.currentTarget.select();
              setOpen(true);
            }}
            onChange={(e) => {
              editing.current = true;
              setText(e.target.value);
              setOpen(true);
              if (value) onChange(null);
            }}
            onBlur={commitTyped}
            onKeyDown={onKeyDown}
            data-testid={`${id}-input`}
          />
          {loading ? (
            <Loader2 className="absolute end-0 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-sky-500" aria-hidden />
          ) : null}
        </div>
      </FieldShell>
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute inset-x-0 top-full z-40 mt-2 max-h-80 overflow-auto rounded-[22px] border border-white/80 bg-white/95 p-1.5 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] ring-1 ring-zinc-200/70 backdrop-blur-xl"
          data-testid={`${id}-options`}
        >
          {places.map((place, i) => {
            const PlaceIcon = place.type === "airport" ? PlaneTakeoff : Building2;
            const where = [place.type === "airport" ? place.cityName : "", place.countryName].filter(Boolean).join(", ");
            return (
              <li
                key={`${place.type}-${place.code}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(place)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5",
                  i === active ? "bg-sky-50/80" : "hover:bg-zinc-50",
                )}
                data-testid="place-option"
              >
                <span
                  className={cn(
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    place.type === "airport" ? "bg-sky-50 text-sky-600" : "bg-indigo-50 text-indigo-600",
                  )}
                >
                  <PlaceIcon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-zinc-900">{place.name}</span>
                  <span className="block truncate text-xs text-zinc-500">
                    {place.type === "airport" ? t("airport") : t("allAirports")}
                    {where ? ` · ${where}` : ""}
                  </span>
                </span>
                <span dir="ltr" className="rounded-lg bg-white px-2 py-0.5 font-mono text-xs font-bold text-zinc-700 ring-1 ring-zinc-200/80">
                  {place.code}
                </span>
              </li>
            );
          })}
          {places.length === 0 && !loading ? (
            <li role="presentation" className="px-3 py-3 text-sm text-zinc-500">
              {failed ? t("placesUnavailable") : t("noPlaces")}
            </li>
          ) : null}
          {places.length === 0 && loading ? (
            <li role="presentation" className="px-3 py-3 text-sm text-zinc-500">
              {t("searchingPlaces")}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
