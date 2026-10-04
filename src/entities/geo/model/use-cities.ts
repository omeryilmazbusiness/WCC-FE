"use client";

import { useCallback, useEffect, useState } from "react";
import type { City, GeoCatalog } from "./types";

export type CitiesState = {
  cities: readonly City[];
  status: "idle" | "loading" | "ready" | "error";
  reload: () => void;
};

const EMPTY: readonly City[] = [];

type Loaded = { country: string; cities: readonly City[]; status: CitiesState["status"] };

/** Cities of `country` from the catalogue; responses for a previous country are ignored. */
export function useCities(catalog: GeoCatalog, country: string): CitiesState {
  const [loaded, setLoaded] = useState<Loaded>({ country: "", cities: EMPTY, status: "idle" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!country) return;
    let live = true;
    setLoaded((prev) => (prev.country === country && prev.status === "ready" ? prev : { country, cities: EMPTY, status: "loading" }));
    catalog.cities(country).then(
      (cities) => live && setLoaded({ country, cities, status: "ready" }),
      () => live && setLoaded({ country, cities: EMPTY, status: "error" }),
    );
    return () => {
      live = false;
    };
  }, [catalog, country, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  if (!country) return { cities: EMPTY, status: "idle", reload };
  if (loaded.country !== country) return { cities: EMPTY, status: "loading", reload };
  return { cities: loaded.cities, status: loaded.status, reload };
}
