"use client";

import { useCallback, useMemo, useState } from "react";
import { countActive, setFilter, type FilterValues } from "./filters";

export type FilterState<V extends FilterValues> = {
  values: V;
  set: <K extends keyof V & string>(id: K, value: V[K]) => void;
  clear: (id: keyof V & string) => void;
  reset: () => void;
  activeCount: number;
  isFiltered: boolean;
};

/** Filter values with their defaults; pairs with SearchFilterBar sections. */
export function useFilterState<V extends FilterValues>(defaults: V): FilterState<V> {
  const [values, setValues] = useState<V>(defaults);
  const set = useCallback(<K extends keyof V & string>(id: K, value: V[K]) => setValues((v) => setFilter(v, id, value)), []);
  const clear = useCallback((id: keyof V & string) => setValues((v) => setFilter(v, id, defaults[id])), [defaults]);
  const reset = useCallback(() => setValues(defaults), [defaults]);
  const activeCount = useMemo(() => countActive(values, defaults), [values, defaults]);
  return { values, set, clear, reset, activeCount, isFiltered: activeCount > 0 };
}
