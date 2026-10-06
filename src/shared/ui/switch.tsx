"use client";

import { cn } from "@/shared/lib/cn";

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
};

/** iOS toggle; `label` is its accessible name. */
export function Switch({ checked, onChange, label, disabled, className, "data-testid": testId }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      data-testid={testId}
      className={cn(
        "relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-emerald-500" : "bg-zinc-300",
        className,
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] h-6 w-6 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.18)] transition-all duration-200",
          checked ? "start-[23px]" : "start-[3px]",
        )}
      />
    </button>
  );
}
