"use client";

import { useLocale, useTranslations } from "next-intl";
import { ChevronRight, KeyRound, Scale, UserRound } from "lucide-react";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { formatMoneyWhole } from "@/shared/lib/format";
import { TONES, type Tone } from "@/shared/ui";
import { available, fundingPct, isExhausted, isLowBalance } from "../lib/funds";
import type { SupplierListItem } from "../model";
import { AvailabilityBadges, FundingBar, HealthPill } from "./badges";
import { CATEGORY_LOOK, ENVIRONMENT_LOOK, PAYMENT_LOOK } from "./look";

export function supplierName(s: { nameEn: string; nameAr: string; code: string }, locale: string): string {
  return (locale === "ar" ? s.nameAr || s.nameEn : s.nameEn || s.nameAr) || s.code;
}

/** Directory card: identity, connection health, funding headroom and search availability. */
export function SupplierCard({ supplier, href }: { supplier: SupplierListItem; href: string }) {
  const t = useTranslations("suppliers");
  const locale = useLocale();
  const cat = CATEGORY_LOOK[supplier.category];
  const CatIcon = cat.icon;
  const pay = PAYMENT_LOOK[supplier.finance.paymentModel];
  const PayIcon = pay.icon;
  const fi = supplier.finance;
  const funds = available(fi);
  const exhausted = isExhausted(fi);
  const low = isLowBalance(fi);
  const tone: Tone = !supplier.isActive ? "zinc" : !supplier.availability.bookable ? "rose" : cat.tone;
  const money = (v: number) => formatMoneyWhole(v, locale, fi.currency);
  const env = supplier.integration.type === "api" ? ENVIRONMENT_LOOK[supplier.integration.environment] : null;
  const EnvIcon = env?.icon;

  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-zinc-200/60 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-30px_rgba(15,23,42,0.55)]"
      data-testid={`supplier-card-${supplier.code}`}
    >
      <div className={cn("relative bg-gradient-to-br p-4 pb-5", TONES[tone].tint)}>
        <div className="flex items-start gap-3.5">
          <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px]", TONES[tone === "rose" ? "rose" : cat.tone].gradient)} aria-hidden>
            <CatIcon className="h-7 w-7" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", TONES[cat.tone].soft)}>{t(`category.${supplier.category}.short`)}</span>
              {supplier.integration.type === "manual" ? null : <HealthPill status={supplier.health.status} latencyMs={supplier.health.latencyMs} className="px-2 py-0.5 text-[11px]" />}
              {env && EnvIcon ? (
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", TONES[env.tone].soft)}>
                  <EnvIcon className="h-3 w-3" aria-hidden />
                  {t(`environment.${supplier.integration.environment}`)}
                </span>
              ) : null}
            </div>
            <h3 className="mt-1.5 line-clamp-2 text-start text-[16px] font-semibold leading-snug tracking-tight text-zinc-950">
              <bdi>{supplierName(supplier, locale)}</bdi>
            </h3>
            <div className="mt-0.5 flex items-center gap-2 text-[12px] font-medium text-zinc-500">
              <span className="font-mono text-[11.5px] tracking-tight text-zinc-600" dir="ltr">
                {supplier.code}
              </span>
              {supplier.contactName ? (
                <span className="inline-flex min-w-0 items-center gap-1 truncate">
                  <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <bdi className="truncate">{supplier.contactName}</bdi>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 pt-3.5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              <PayIcon className={cn("h-3.5 w-3.5", TONES[pay.tone].text)} aria-hidden />
              {t(`payment.${fi.paymentModel}.label`)}
            </p>
            {funds.limited ? (
              <p className={cn("text-[22px] font-bold leading-tight tabular-nums tracking-tight", exhausted ? "text-rose-600" : "text-zinc-950")}>{money(funds.amount)}</p>
            ) : (
              <p className="text-[15px] font-semibold leading-8 text-zinc-500">{t("card.unlimited")}</p>
            )}
          </div>
          <div className="text-end">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{t("card.spend30d")}</p>
            <p className="text-[14px] font-semibold tabular-nums text-zinc-800">{money(supplier.spend30d)}</p>
            <p className="text-[11px] font-medium text-zinc-400">{t("card.bookings", { n: supplier.bookings30d })}</p>
          </div>
        </div>
        {funds.limited ? <FundingBar pct={fundingPct(fi)} exhausted={exhausted} low={low} /> : null}

        <div className="mt-auto space-y-2.5 border-t border-zinc-100 pt-3">
          <AvailabilityBadges availability={supplier.availability} />
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="inline-flex min-w-0 items-center gap-3 text-zinc-500">
              {supplier.hasCredentials ? (
                <span className="inline-flex items-center gap-1">
                  <KeyRound className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
                  {t("card.credentials")}
                </span>
              ) : null}
              {supplier.openDisputes > 0 ? (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                  <Scale className="h-3.5 w-3.5" aria-hidden />
                  {t("card.disputes", { n: supplier.openDisputes })}
                </span>
              ) : null}
            </span>
            <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-zinc-900">
              {t("card.open")}
              <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
