"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type AssistantUi = {
  /** False when the viewer may not use AI; launchers render nothing. */
  enabled: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  /** Opens the panel and asks `prompt` straight away (suggestion cards, deep links). */
  ask: (prompt: string) => void;
  /** Prompt waiting for the panel to send it; the panel clears it once sent. */
  pendingPrompt: string | null;
  clearPendingPrompt: () => void;
};

const AssistantContext = createContext<AssistantUi | null>(null);

/** One assistant per signed-in shell: the header icon, page bubbles and the panel share it. */
export function AssistantProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [open, setOpenState] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const setOpen = useCallback((next: boolean) => setOpenState(enabled && next), [enabled]);
  const toggle = useCallback(() => setOpenState((o) => enabled && !o), [enabled]);
  const ask = useCallback(
    (prompt: string) => {
      if (!enabled) return;
      setPendingPrompt(prompt);
      setOpenState(true);
    },
    [enabled],
  );
  const clearPendingPrompt = useCallback(() => setPendingPrompt(null), []);

  const value = useMemo(
    () => ({ enabled, open: enabled && open, setOpen, toggle, ask, pendingPrompt, clearPendingPrompt }),
    [enabled, open, setOpen, toggle, ask, pendingPrompt, clearPendingPrompt],
  );
  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

const DISABLED: AssistantUi = {
  enabled: false,
  open: false,
  setOpen: () => {},
  toggle: () => {},
  ask: () => {},
  pendingPrompt: null,
  clearPendingPrompt: () => {},
};

/** Outside a provider (public pages, tests) the assistant is simply off. */
export function useAssistant(): AssistantUi {
  return useContext(AssistantContext) ?? DISABLED;
}
