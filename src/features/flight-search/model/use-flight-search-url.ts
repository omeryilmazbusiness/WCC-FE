"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { FlightSearchParams } from "@/entities/flight";
import {
  localDay,
  readFormParams,
  submittedSearch,
  writeFormParams,
  type FlightSearchForm,
} from "./search-form";

export type FlightSearchUrlState = {
  /** Form values the URL describes (defaults where it says nothing). */
  form: FlightSearchForm;
  /** The search to run, or null until a complete, valid one is submitted. */
  params: FlightSearchParams | null;
  /** Stable identity of `params` for query dependencies. */
  key: string;
  today: string;
  /** Pushes the search into the URL; false when the URL already holds it. */
  submit: (form: FlightSearchForm) => boolean;
};

/**
 * The submitted search lives in the URL so it survives reloads, can be shared with a
 * colleague and Back returns to the previous search. History API updates are synced
 * into `useSearchParams` by Next.js without a server round trip.
 */
export function useFlightSearchUrl(): FlightSearchUrlState {
  const search = useSearchParams();
  const today = localDay(new Date());
  const query = search.toString();
  const form = useMemo(() => readFormParams(new URLSearchParams(query), today), [query, today]);
  const params = useMemo(() => submittedSearch(new URLSearchParams(query), today), [query, today]);
  const key = params ? JSON.stringify(params) : "";

  const submit = useCallback((next: FlightSearchForm) => {
    const { pathname, search: current, hash } = window.location;
    const qs = writeFormParams(new URLSearchParams(current), next).toString();
    const url = `${pathname}${qs ? `?${qs}` : ""}${hash}`;
    if (`${pathname}${current}${hash}` === url) return false;
    window.history.pushState(null, "", url);
    return true;
  }, []);

  return { form, params, key, today, submit };
}
