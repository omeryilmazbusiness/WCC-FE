import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { IconTile, Label, type Tone } from "@/shared/ui";

/** Borderless control styling for inputs living inside a FieldShell. */
export const FIELD_CONTROL =
  "h-8 rounded-none border-0 bg-transparent px-0 py-0 text-[15px] font-semibold text-zinc-950 shadow-none placeholder:font-medium placeholder:text-zinc-400 focus-visible:border-0 focus-visible:shadow-none focus-visible:ring-0 focus:ring-0";

type FieldShellProps = {
  htmlFor: string;
  label: string;
  icon: LucideIcon;
  tone: Tone;
  hint?: string;
  error?: string;
  errorId?: string;
  className?: string;
  children: ReactNode;
};

/** iOS-style grouped field: tinted icon, small caption and a borderless control. */
export function FieldShell({ htmlFor, label, icon, tone, hint, error, errorId, className, children }: FieldShellProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        className={cn(
          "rounded-[20px] bg-zinc-50/80 px-3.5 pb-2 pt-3 ring-1 ring-inset ring-zinc-200/70 transition-all duration-300",
          "focus-within:bg-white focus-within:shadow-[0_14px_32px_-22px_rgba(14,165,233,0.55)] focus-within:ring-2 focus-within:ring-sky-300/70",
          error && "bg-rose-50/50 ring-rose-300 focus-within:ring-rose-300",
        )}
      >
        <div className="mb-1 flex items-center gap-2">
          <IconTile icon={icon} tone={tone} size="sm" />
          <Label htmlFor={htmlFor} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
            {label}
          </Label>
        </div>
        {children}
      </div>
      {error ? (
        <p id={errorId} className="px-1 text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p className="px-1 text-xs text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
}
