"use client";

import type { ReactNode } from "react";

export { ChipSet, ChoiceGrid, MoneyInput, StarPicker, Stepper, SwitchRow, type ChoiceOption } from "@/shared/ui";

/** Small label + control pair used where a full FormField would be overkill. */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="block text-[13px] font-semibold text-zinc-700">{label}</span>
      {children}
      {hint ? <span className="block text-[11.5px] font-medium text-zinc-500">{hint}</span> : null}
    </div>
  );
}
