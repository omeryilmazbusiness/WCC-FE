"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { ROLE_LOOK } from "@/entities/identity";
import type { AppRole } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import { TONES } from "@/shared/ui";

type Props = {
  roles: readonly AppRole[];
  value: AppRole;
  onChange: (role: AppRole) => void;
  disabled?: boolean;
};

/** Big-icon role cards with a one-line summary of what each role can do. */
export function RolePicker({ roles, value, onChange, disabled }: Props) {
  const t = useTranslations("team");

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"];
    if (disabled || !keys.includes(e.key)) return;
    e.preventDefault();
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const forward = e.key === "ArrowDown" || e.key === (rtl ? "ArrowLeft" : "ArrowRight");
    const next = roles[(roles.indexOf(value) + (forward ? 1 : -1) + roles.length) % roles.length];
    onChange(next);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-role="${next}"]`)?.focus();
  }

  return (
    <div role="radiogroup" aria-label={t("form.role")} onKeyDown={onKeyDown} className="grid gap-2 sm:grid-cols-2" data-testid="team-role-picker">
      {roles.map((role) => {
        const look = ROLE_LOOK[role];
        const Icon = look.icon;
        const active = role === value;
        return (
          <button
            key={role}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            disabled={disabled}
            data-role={role}
            onClick={() => onChange(role)}
            className={cn(
              "flex items-start gap-3 rounded-[18px] border p-3 text-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60",
              active ? cn("border-transparent bg-gradient-to-br ring-2 ring-zinc-900/80", TONES[look.tone].tint) : "border-zinc-200/80 bg-white hover:border-zinc-300",
            )}
          >
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]", active ? TONES[look.tone].gradient : TONES[look.tone].soft)} aria-hidden>
              <Icon className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-[13.5px] font-semibold text-zinc-950">{t(`roles.${role}`)}</span>
                {active ? <Check className="h-4 w-4 text-zinc-900" strokeWidth={3} aria-hidden /> : null}
              </span>
              <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-snug text-zinc-500">{t(`roleHint.${role}`)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
