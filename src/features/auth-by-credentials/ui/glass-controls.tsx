"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/cn";

/** Controls for the dark sign-in card (night-aurora); the light app UI kit stays elsewhere. */

export const glassInputClass =
  "h-12 w-full min-w-0 bg-transparent text-[15px] font-medium text-white caret-sky-300 outline-none placeholder:text-white/30 disabled:opacity-60";

export function GlassGroup({ children, invalid }: { children: ReactNode; invalid?: boolean }) {
  return (
    <div
      className={cn(
        "liquid-glass-group divide-y divide-white/10 overflow-hidden rounded-[18px] transition-shadow duration-200 focus-within:shadow-[inset_0_0_0_1px_rgba(125,211,252,0.45),0_0_0_4px_rgba(56,189,248,0.12)]",
        invalid && "shadow-[inset_0_0_0_1px_rgba(253,164,175,0.45)]",
      )}
    >
      {children}
    </div>
  );
}

export function GlassRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4">
      <label htmlFor={htmlFor} className="w-[92px] shrink-0 text-[14px] font-medium text-white/60">
        {label}
      </label>
      {children}
    </div>
  );
}

export function GlassButton({
  busy,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      {...rest}
      aria-busy={busy || undefined}
      className={cn(
        "relative flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-[15px] font-semibold text-zinc-950 shadow-[0_12px_30px_-14px_rgba(255,255,255,0.6)] transition-[transform,background-color,opacity] duration-200 hover:bg-white/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
        className,
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} aria-hidden /> : null}
      {children}
    </button>
  );
}

export function GlassLinkButton({ className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={cn("text-[13px] font-medium text-white/55 transition-colors hover:text-white", className)}
    />
  );
}

export function GlassError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p
      id={id}
      role="alert"
      className="animate-setup-in flex items-start gap-2 rounded-[14px] bg-rose-500/10 px-3.5 py-2.5 text-[13px] font-medium text-rose-200 shadow-[inset_0_0_0_0.5px_rgba(253,164,175,0.3)]"
    >
      <AlertCircle className="mt-px h-4 w-4 shrink-0 text-rose-300" strokeWidth={2} aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function GlassNotice({
  icon,
  tone = "neutral",
  children,
  ...rest
}: {
  icon: ReactNode;
  tone?: "neutral" | "warning";
  children: ReactNode;
  role?: "alert" | "status";
  "data-testid"?: string;
}) {
  return (
    <div
      {...rest}
      className={cn(
        "flex items-start gap-3 rounded-[18px] p-3.5",
        tone === "warning"
          ? "bg-amber-400/10 shadow-[inset_0_0_0_0.5px_rgba(252,211,77,0.3)]"
          : "bg-white/[0.06] shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.12)]",
      )}
    >
      <span
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]",
          tone === "warning" ? "bg-amber-400/15 text-amber-200" : "bg-white/10 text-white/80",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 pt-0.5 text-[13px] font-medium leading-snug text-white/75">{children}</div>
    </div>
  );
}
