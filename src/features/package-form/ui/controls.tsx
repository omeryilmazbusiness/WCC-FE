"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { Check, Minus, Plus, Star, type LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Input, TONES, type Tone } from "@/shared/ui";

export type ChoiceOption<T extends string> = { value: T; label: string; hint?: string; icon: LucideIcon; tone: Tone };

/** Large single-choice tiles with a gradient icon on the selected one. */
export function ChoiceGrid<T extends string>({
  value,
  onChange,
  options,
  columns = 2,
  name,
}: {
  value: T | "";
  onChange: (v: T) => void;
  options: readonly ChoiceOption<T>[];
  columns?: 2 | 3 | 4;
  name: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={cn("grid gap-2.5", columns === 2 && "grid-cols-2", columns === 3 && "grid-cols-2 sm:grid-cols-3", columns === 4 && "grid-cols-2 sm:grid-cols-4")}
    >
      {options.map((o) => {
        const active = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            data-testid={`${name}-${o.value}`}
            className={cn(
              "relative flex min-w-0 items-center gap-3 rounded-[20px] border p-3 text-start transition duration-200",
              active
                ? "border-zinc-900/80 bg-white shadow-[0_12px_28px_-20px_rgba(15,23,42,0.6)] ring-1 ring-zinc-900/80"
                : "border-zinc-200/70 bg-zinc-50/60 hover:bg-white hover:shadow-[0_10px_24px_-20px_rgba(15,23,42,0.45)]",
            )}
          >
            <span
              className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] transition", active ? TONES[o.tone].gradient : TONES[o.tone].soft)}
              aria-hidden
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={2.1} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-semibold text-zinc-900">{o.label}</span>
              {o.hint ? <span className="block truncate text-[11.5px] font-medium text-zinc-500">{o.hint}</span> : null}
            </span>
            {active ? (
              <span className="absolute end-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-950 text-white" aria-hidden>
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Multi-select chips (kit items, ziyarat places). */
export function ChipSet({
  values,
  onChange,
  options,
  tone = "emerald",
  name,
}: {
  values: readonly string[];
  onChange: (v: string[]) => void;
  options: readonly { value: string; label: string; icon?: LucideIcon }[];
  tone?: Tone;
  name: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={name}>
      {options.map((o) => {
        const on = values.includes(o.value);
        const Icon = o.icon ?? Check;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? values.filter((v) => v !== o.value) : [...values, o.value])}
            data-testid={`${name}-${o.value}`}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition",
              on ? cn("border-transparent", TONES[tone].solid) : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900",
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2.2} aria-hidden />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function StarPicker({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n}★`}
          onClick={() => onChange(value === n ? 0 : n)}
          className="rounded-lg p-1 transition hover:scale-110"
        >
          <Star className={cn("h-7 w-7", n <= value ? "fill-amber-400 text-amber-400" : "text-zinc-300")} strokeWidth={1.8} />
        </button>
      ))}
    </div>
  );
}

/** − value + stepper for small integers (nights, days, months). */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  suffix,
  label,
  testId,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
  label: string;
  testId?: string;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, Number.isFinite(n) ? Math.trunc(n) : min));
  const btn =
    "flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-700 shadow-sm ring-1 ring-zinc-200 transition hover:bg-zinc-50 disabled:opacity-40";
  return (
    <div className="flex h-12 items-center gap-2 rounded-2xl bg-zinc-100/80 p-1" data-testid={testId}>
      <button type="button" className={btn} onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label={`${label} −`}>
        <Minus className="h-4 w-4" strokeWidth={2.4} />
      </button>
      <div className="flex min-w-0 flex-1 items-baseline justify-center gap-1">
        <input
          inputMode="numeric"
          aria-label={label}
          value={String(value)}
          onChange={(e) => onChange(clamp(Number(e.target.value.replace(/\D/g, "") || min)))}
          className="w-12 bg-transparent text-center text-[17px] font-semibold tabular-nums text-zinc-950 outline-none"
        />
        {suffix ? <span className="truncate text-[12px] font-medium text-zinc-500">{suffix}</span> : null}
      </div>
      <button type="button" className={btn} onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label={`${label} +`}>
        <Plus className="h-4 w-4" strokeWidth={2.4} />
      </button>
    </div>
  );
}

/** iOS settings row with a switch. */
export function SwitchRow({
  icon: Icon,
  tone,
  label,
  hint,
  checked,
  onChange,
  testId,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  hint?: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  testId?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-[18px] bg-zinc-50/80 px-3 py-2.5 ring-1 ring-inset ring-zinc-900/[0.04]">
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]", TONES[tone].soft)} aria-hidden>
        <Icon className="h-5 w-5" strokeWidth={2.1} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold text-zinc-900">{label}</span>
        {hint ? <span className="block text-[11.5px] font-medium text-zinc-500">{hint}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        data-testid={testId}
        className={cn("relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors", checked ? "bg-emerald-500" : "bg-zinc-300")}
      >
        <span
          className={cn(
            "absolute top-[3px] h-6 w-6 rounded-full bg-white shadow transition-all",
            checked ? "start-[23px]" : "start-[3px]",
          )}
        />
      </button>
    </label>
  );
}

type MoneyProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  value: string;
  onChange: (v: string) => void;
  currency: string;
};

/** Decimal money input with the currency code as a trailing badge. */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyProps>(({ value, onChange, currency, className, ...rest }, ref) => (
  <div className="relative">
    <Input
      ref={ref}
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
      className={cn("h-12 pe-16 text-[15px] font-semibold tabular-nums", className)}
      placeholder="0"
      {...rest}
    />
    <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 rounded-lg bg-zinc-100 px-2 py-1 text-[11px] font-bold text-zinc-500">
      {currency}
    </span>
  </div>
));
MoneyInput.displayName = "MoneyInput";

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
