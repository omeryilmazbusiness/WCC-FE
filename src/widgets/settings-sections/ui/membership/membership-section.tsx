"use client";

import { CalendarRange, CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";
import { COMPANY_PLANS, ofCompanyPlan, type CompanyPlan } from "@/entities/company";
import { useCan, useViewer } from "@/entities/viewer";
import { useUpgradePlan } from "@/features/request-plan-upgrade";
import { cn } from "@/shared/lib/cn";
import { GlyphTile, TONES } from "@/shared/ui";
import { PLAN_LOOK } from "./look";
import { MembershipPlanCard } from "./plan-card";

/** Company package comparison: current status plus three vertical feature cards. */
export function MembershipSection() {
  const t = useTranslations("settings.membership");
  const tp = useTranslations("adminCompanies.plans");
  const viewer = useViewer();
  const canRequest = useCan("support.write");
  const { openPlan } = useUpgradePlan();
  const company = viewer.workspace?.company;
  const current = company?.plan ? ofCompanyPlan(company.plan).plan : undefined;
  const look = current ? PLAN_LOOK[current] : null;

  return (
    <div className="space-y-6" data-testid="membership-section">
      <section
        className={cn(
          "flex flex-col gap-4 overflow-hidden rounded-[28px] bg-gradient-to-br p-5 ring-1 sm:flex-row sm:items-center sm:p-6",
          look ? `${look.shell}` : "from-zinc-50 via-white to-white ring-zinc-200/70",
        )}
        data-testid="membership-status"
      >
        <GlyphTile icon={look?.icon ?? CreditCard} tone={look?.tone ?? "zinc"} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{t("statusTitle")}</p>
          <h2 className={cn("mt-1 text-[22px] font-bold tracking-tight", look?.ink ?? "text-zinc-950")}>
            {current ? tp(`${current}.name`) : t("noPlanTitle")}
          </h2>
          <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-zinc-500">
            {current ? t("statusBody", { plan: tp(`${current}.name`) }) : t("noPlanBody")}
          </p>
        </div>
        <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold", TONES.amber.soft)}>
          <CalendarRange className="h-3.5 w-3.5" aria-hidden />
          {t("termYears")}
        </span>
      </section>

      <div>
        <h3 className="px-1 text-[15px] font-semibold text-zinc-950">{t("catalogTitle")}</h3>
        <p className="mt-1 max-w-2xl px-1 text-[13px] leading-relaxed text-zinc-500">{t("catalogHint")}</p>
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-3" data-testid="membership-cards">
        {COMPANY_PLANS.map((plan) => (
          <MembershipPlanCard
            key={plan}
            plan={plan}
            current={current}
            canRequest={canRequest}
            highlighted={plan === "premium"}
            onUpgrade={(next: CompanyPlan) => openPlan(next)}
          />
        ))}
      </div>
    </div>
  );
}
