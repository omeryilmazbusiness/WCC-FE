"use client";

import { createContext, useContext, type ReactNode } from "react";
import { Sparkles } from "lucide-react";

type AiFields = { has: (field: string) => boolean; label: string };

const AiFieldsContext = createContext<AiFields>({ has: () => false, label: "" });

/** Marks form fields the AI filled so every section can flag them for review. */
export function AiFieldsProvider({ fields, label, children }: { fields: ReadonlySet<string>; label: string; children: ReactNode }) {
  return <AiFieldsContext.Provider value={{ has: (f) => fields.has(f), label }}>{children}</AiFieldsContext.Provider>;
}

/** Badge and input classes for a backend field name (snake_case). */
export function useAiField(field: string) {
  const ai = useContext(AiFieldsContext);
  const marked = ai.has(field);
  return {
    badge: marked ? <AIBadge label={ai.label} /> : null,
    ring: marked ? "border-violet-300 bg-violet-50/40 focus-visible:ring-violet-500/20" : undefined,
  };
}

function AIBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-white">
      <Sparkles className="h-2.5 w-2.5" aria-hidden />
      {label}
    </span>
  );
}
