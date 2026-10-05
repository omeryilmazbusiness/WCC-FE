"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, TONES, type Tone } from "@/shared/ui";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: LucideIcon;
  tone: Tone;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  testId?: string;
};

/** Shared shell for the booking quick-action dialogs: big gradient icon, title, body, footer. */
export function ActionDialog({ open, onOpenChange, icon: Icon, tone, title, description, children, footer, testId }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-[28px] p-0" data-testid={testId}>
        <DialogHeader className="flex flex-row items-start gap-4 space-y-0 px-6 pb-2 pt-6 text-start">
          <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", TONES[tone].gradient)} aria-hidden>
            <Icon className="h-6 w-6" strokeWidth={2} />
          </span>
          <div className="min-w-0 pe-6">
            <DialogTitle className="text-[18px] font-semibold tracking-tight">{title}</DialogTitle>
            {description ? <DialogDescription className="mt-1 text-[13px] text-zinc-500">{description}</DialogDescription> : null}
          </div>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-3">{children}</div>
        {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 px-6 py-4">{footer}</div> : null}
      </DialogContent>
    </Dialog>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[12.5px] font-semibold text-zinc-600">
        {label}
      </label>
      {children}
      {hint ? <p className="text-[12px] text-zinc-400">{hint}</p> : null}
    </div>
  );
}

/** Large tappable option card used for document / channel pickers. */
export function ChoiceCard({
  selected,
  onSelect,
  icon: Icon,
  tone,
  label,
  hint,
  disabled,
  testId,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: LucideIcon;
  tone: Tone;
  label: string;
  hint?: string;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      data-testid={testId}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition",
        selected ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900" : "border-zinc-200/80 hover:bg-zinc-50",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", TONES[tone].solid)} aria-hidden>
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13.5px] font-semibold text-zinc-950">{label}</span>
        {hint ? <span className="block truncate text-[12px] text-zinc-500">{hint}</span> : null}
      </span>
    </button>
  );
}
