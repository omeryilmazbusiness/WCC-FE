"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeCurrency, type FxFilters } from "@/entities/fx";

const FILTER_DEBOUNCE_MS = 350;

export type RateFilters = {
  baseInput: string;
  quoteInput: string;
  from: string;
  to: string;
  /** 0-based history page. */
  page: number;
  filters: FxFilters;
  isFiltered: boolean;
  /** `BASE/QUOTE` when both codes are applied. */
  activePair: string | null;
  setBaseInput: (value: string) => void;
  setQuoteInput: (value: string) => void;
  setFrom: (day: string) => void;
  setTo: (day: string) => void;
  setPage: (page: number) => void;
  /** Applies a pair immediately (no debounce); passing the active pair clears it. */
  togglePair: (base: string, quote: string) => void;
  reset: () => void;
};

/** History filters: typed codes are debounced, chips and dates apply at once; any change rewinds to page 1. */
export function useRateFilters(): RateFilters {
  const [baseInput, setBaseInput] = useState("");
  const [quoteInput, setQuoteInput] = useState("");
  const [pair, setPair] = useState({ base: "", quote: "" });
  const [from, setFromDay] = useState("");
  const [to, setToDay] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const base = normalizeCurrency(baseInput);
    const quote = normalizeCurrency(quoteInput);
    if (base === pair.base && quote === pair.quote) return;
    const timer = window.setTimeout(() => {
      setPair({ base, quote });
      setPage(0);
    }, FILTER_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [baseInput, quoteInput, pair.base, pair.quote]);

  const filters = useMemo<FxFilters>(
    () => ({
      base: pair.base || undefined,
      quote: pair.quote || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [pair.base, pair.quote, from, to],
  );

  const activePair = pair.base && pair.quote ? `${pair.base}/${pair.quote}` : null;

  function applyPair(base: string, quote: string) {
    setBaseInput(base);
    setQuoteInput(quote);
    setPair({ base, quote });
    setPage(0);
  }

  return {
    baseInput,
    quoteInput,
    from,
    to,
    page,
    filters,
    isFiltered: Object.values(filters).some(Boolean),
    activePair,
    setBaseInput: (v) => setBaseInput(v.toUpperCase()),
    setQuoteInput: (v) => setQuoteInput(v.toUpperCase()),
    setFrom: (day) => {
      setFromDay(day);
      setPage(0);
    },
    setTo: (day) => {
      setToDay(day);
      setPage(0);
    },
    setPage,
    togglePair: (base, quote) => (activePair === `${base}/${quote}` ? applyPair("", "") : applyPair(base, quote)),
    reset: () => {
      applyPair("", "");
      setFromDay("");
      setToDay("");
    },
  };
}
