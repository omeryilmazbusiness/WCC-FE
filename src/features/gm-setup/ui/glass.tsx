"use client";

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";

/** App-icon gradients, one per step, so each screen keeps a quiet identity. */
export const STEP_TINTS = {
  company: "from-sky-400 to-blue-600",
  staff: "from-amber-400 to-orange-500",
  ai: "from-violet-400 to-fuchsia-600",
  channels: "from-emerald-400 to-teal-600",
  done: "from-emerald-400 to-green-600",
} as const;

export type StepTint = keyof typeof STEP_TINTS;

export function AppIcon({
  icon: Icon,
  tint,
  size = "lg",
}: {
  icon: LucideIcon;
  tint: StepTint;
  size?: "sm" | "lg";
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center bg-gradient-to-b text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_24px_-12px_rgba(15,23,42,0.55)]",
        STEP_TINTS[tint],
        size === "lg" ? "h-16 w-16 rounded-[20px]" : "h-9 w-9 rounded-[11px]",
      )}
      aria-hidden
    >
      <Icon className={size === "lg" ? "h-8 w-8" : "h-[18px] w-[18px]"} strokeWidth={1.75} />
    </span>
  );
}

export function StepHero({
  icon,
  tint,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  tint: StepTint;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <AppIcon icon={icon} tint={tint} />
      <div className="space-y-1">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-zinc-950">{title}</h2>
        <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-zinc-500">{subtitle}</p>
      </div>
    </div>
  );
}

/** Inset-grouped section, as in iOS Settings. */
export function GlassGroup({
  title,
  footer,
  children,
  className,
}: {
  title?: string;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-1.5", className)}>
      {title ? (
        <h3 className="px-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
          {title}
        </h3>
      ) : null}
      <div className="liquid-glass-group divide-y divide-zinc-900/[0.06] overflow-hidden rounded-[18px]">
        {children}
      </div>
      {footer ? <p className="px-4 text-[11px] leading-relaxed text-zinc-500">{footer}</p> : null}
    </section>
  );
}

export function GlassField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="px-4">
      <div className="flex min-h-[46px] items-center gap-3">
        <label htmlFor={id} className="w-[112px] shrink-0 text-[13px] font-medium text-zinc-900">
          {label}
        </label>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {error ? (
        <p id={`${id}-error`} className="-mt-1 pb-2 ps-[124px] text-[11px] font-medium text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const GlassInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function GlassInput({ className, invalid, ...props }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid && props.id ? `${props.id}-error` : undefined}
        className={cn(
          "h-[46px] w-full bg-transparent text-[14px] text-zinc-950 outline-none placeholder:text-zinc-400 disabled:text-zinc-400",
          invalid && "text-rose-600",
          className,
        )}
        {...props}
      />
    );
  },
);

type PillProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "glass" | "plain";
};

export const PillButton = forwardRef<HTMLButtonElement, PillProps>(function PillButton(
  { className, variant = "primary", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-semibold tracking-[-0.01em] transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 focus-visible:ring-offset-2",
        variant === "primary" &&
          "bg-zinc-950 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_22px_-12px_rgba(15,23,42,0.7)] hover:bg-zinc-800",
        variant === "glass" && "glass-pill text-zinc-900 hover:bg-white/80",
        variant === "plain" && "h-9 px-3 text-[13px] font-medium text-zinc-500 hover:text-zinc-900",
        className,
      )}
      {...props}
    />
  );
});

/** Equal-width choice chips; keeps rows symmetric regardless of label length. */
export function ChoiceGrid<T extends string>({
  value,
  options,
  onChange,
  columns,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  columns: 2 | 3 | 4;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "grid gap-1 rounded-[14px] bg-zinc-900/[0.05] p-1",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
        columns === 4 && "grid-cols-4",
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-8 truncate rounded-[10px] px-2 text-[12px] font-semibold transition-all duration-200",
              active
                ? "bg-white text-zinc-950 shadow-[0_1px_3px_rgba(15,23,42,0.14),0_0_0_0.5px_rgba(15,23,42,0.06)]"
                : "text-zinc-500 hover:text-zinc-800",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
