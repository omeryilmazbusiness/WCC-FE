"use client";

import { useTranslations } from "next-intl";
import { Crown, Gem, Sparkles } from "lucide-react";
import { COMPANY_PLANS, PLAN_CATALOG, type CompanyPlan } from "@/entities/company/plan";
import { cn } from "@/shared/lib/cn";

const ICONS = {
  standard: Sparkles,
  premium: Crown,
  ultimate: Gem,
} as const;

const TONE = {
  standard: "from-sky-50 to-white ring-sky-200 text-sky-700",
  premium: "from-violet-50 to-white ring-violet-200 text-violet-700",
  ultimate: "from-amber-50 to-white ring-amber-200 text-amber-700",
} as const;

type Props = {
  value: CompanyPlan;
  onChange: (plan: CompanyPlan) => void;
  invalid?: boolean;
};

function cap(n: number, unlimited: string): string {
  return n <= 0 ? unlimited : String(n);
}

export function PlanPicker({ value, onChange, invalid }: Props) {
  const t = useTranslations("adminCompanies.plans");
  return (
    <div
      role="radiogroup"
      aria-label={t("label")}
      aria-invalid={invalid || undefined}
      className="grid gap-3 md:grid-cols-3"
      data-testid="company-plan-picker"
    >
      {COMPANY_PLANS.map((plan) => {
        const Icon = ICONS[plan];
        const limits = PLAN_CATALOG[plan].limits;
        const selected = value === plan;
        return (
          <button
            key={plan}
            type="button"
            role="radio"
            aria-checked={selected}
            data-testid={`company-plan-${plan}`}
            onClick={() => onChange(plan)}
            className={cn(
              "flex flex-col rounded-[22px] bg-gradient-to-b p-4 text-start ring-1 transition",
              TONE[plan],
              selected
                ? "ring-2 ring-offset-2 ring-offset-white shadow-[0_10px_24px_-16px_rgba(15,23,42,0.45)]"
                : "hover:ring-2",
            )}
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold tracking-tight">
              <Icon className="h-5 w-5" aria-hidden />
              {t(`${plan}.name`)}
            </span>
            <span className="mt-1 text-[12px] leading-5 text-zinc-600">{t(`${plan}.blurb`)}</span>
            <ul className="mt-3 space-y-1 text-[11px] font-medium text-zinc-500">
              <li>{t("seats", { n: cap(limits.users, t("unlimited")) })}</li>
              <li>{t("branches", { n: cap(limits.branches, t("unlimited")) })}</li>
              <li>{t("ai", { n: cap(limits.aiPerDay, t("unlimited")) })}</li>
            </ul>
          </button>
        );
      })}
    </div>
  );
}
