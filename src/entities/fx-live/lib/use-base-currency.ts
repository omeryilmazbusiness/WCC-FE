"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "wcc.fxLive.base";

/** Viewer's reference currency for the live board, remembered per browser. */
export function useBaseCurrency(): [string | null, (code: string | null) => void] {
  const [base, setBaseState] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && /^[A-Z]{3}$/.test(saved)) setBaseState(saved);
    } catch {
      /* storage unavailable (private mode) */
    }
  }, []);

  const setBase = useCallback((code: string | null) => {
    setBaseState(code);
    try {
      if (code) window.localStorage.setItem(STORAGE_KEY, code);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable (private mode) */
    }
  }, []);

  return [base, setBase];
}
