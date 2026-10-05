"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, Gauge, PencilLine, Power, ShoppingBag, TrendingUp, TriangleAlert, Wallet, type LucideIcon } from "lucide-react";
import {
  AvailabilityBadges,
  CATEGORY_LOOK,
  CONTRACT_WARN_DAYS,
  ENVIRONMENT_LOOK,
  HealthPill,
  available,
  fundingPct,
  isExhausted,
  isLowBalance,
  FundingBar,
  lookToBookRatio,
  supplierName,
  type SupplierDetail,
} from "@/entities/supplier";
import { cn } from "@/shared/lib/cn";
import { formatMoneyWhole } from "@/shared/lib/format";
import { TONES, type Tone } from "@/shared/ui";

type Props = {
  detail: SupplierDetail;
  canWrite: boolean;
  toggling: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
};

export function SupplierHero({ detail, canWrite, toggling, onEdit, onToggleActive }: Props) {
  const t = useTranslations("suppliers");
  const locale = useLocale();
  const { supplier: s, metrics, volume } = detail;
  const cat = CATEGORY_LOOK[s.category];
  const CatIcon = cat.icon;
  const tone: Tone = !s.isActive ? "zinc" : !s.availability.bookable ? "rose" : cat.tone;
  const fi = s.finance;
  const funds = available(fi);
  const exhausted = isExhausted(fi);
  const low = isLowBalance(fi);
  const money = (v: number) => formatMoneyWhole(v, locale, fi.currency);
  const env = s.integration.type === "manual" ? null : ENVIRONMENT_LOOK[s.integration.environment];
  const EnvIcon = env?.icon;
  const days = s.contractDaysLeft;
  const primary = supplierName(s, locale);
  const other = locale === "ar" ? s.nameEn : s.nameAr;
  const secondary = other && other !== primary ? other : "";

  const stats: { icon: LucideIcon; tone: Tone; label: string; value: ReactNode; id: string }[] = [
    {
      icon: Wallet,
      tone: exhausted ? "rose" : low ? "amber" : "emerald",
      label: fi.paymentModel === "postpaid" ? t("hero.creditLeft") : t("hero.balance"),
      value: funds.limited ? money(funds.amount) : t("card.unlimited"),
      id: "funds",
    },
    { icon: TrendingUp, tone: "indigo", label: t("hero.spend30d"), value: money(volume.spend), id: "spend" },
    { icon: ShoppingBag, tone: "sky", label: t("hero.bookings30d"), value: volume.bookings, id: "bookings" },
    { icon: Gauge, tone: "violet", label: t("hero.lookToBook"), value: lookToBookRatio(metrics.searches, metrics.bookings) ?? "—", id: "l2b" },
    {
      icon: TriangleAlert,
      tone: metrics.errorRatePct >= 5 ? "rose" : metrics.errorRatePct >= 1 ? "amber" : "teal",
      label: t("hero.errorRate"),
      value: metrics.searches ? `${metrics.errorRatePct}%` : "—",
      id: "errors",
    },
    {
      icon: CalendarClock,
      tone: days === null ? "zinc" : days < 0 ? "rose" : days <= CONTRACT_WARN_DAYS ? "amber" : "emerald",
      label: t("hero.contract"),
      value: days === null ? "—" : days < 0 ? t("hero.expired") : t("hero.daysLeft", { n: days }),
      id: "contract",
    },
  ];

  return (
    <section className="overflow-hidden rounded-[32px] border border-zinc-200/60 bg-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)]" data-testid="supplier-hero">
      <div className={cn("relative h-28 bg-gradient-to-br sm:h-32", TONES[tone].tint)}>
        <div className={cn("absolute inset-0 opacity-[0.18]", TONES[tone].gradient)} style={{ maskImage: "radial-gradient(120% 140% at 0% 0%, black, transparent 70%)" }} aria-hidden />
        {canWrite ? (
          <div className="absolute end-4 top-4 flex gap-2">
            <button
              type="button"
              onClick={onToggleActive}
              disabled={toggling}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-2xl px-3.5 text-[13px] font-semibold ring-1 ring-inset transition disabled:opacity-60",
                s.isActive ? "bg-white/90 text-zinc-700 ring-zinc-200 hover:bg-white" : "bg-emerald-500 text-white ring-emerald-500 hover:bg-emerald-600",
              )}
              data-testid="supplier-toggle-active"
            >
              <Power className="h-4 w-4" aria-hidden />
              {s.isActive ? t("hero.deactivate") : t("hero.activate")}
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-zinc-950 px-3.5 text-[13px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(15,23,42,0.8)] transition hover:bg-zinc-800"
              data-testid="supplier-edit"
            >
              <PencilLine className="h-4 w-4" aria-hidden />
              {t("hero.edit")}
            </button>
          </div>
        ) : null}
      </div>

      <div className="relative -mt-12 px-5 pb-5 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <span className={cn("flex h-24 w-24 shrink-0 items-center justify-center rounded-[30px] ring-[5px] ring-white", TONES[tone === "rose" ? "rose" : cat.tone].gradient)} aria-hidden>
            <CatIcon className="h-11 w-11" strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn("rounded-full px-2.5 py-1 text-[11.5px] font-bold", TONES[cat.tone].soft)}>{t(`category.${s.category}.label`)}</span>
              {s.integration.type !== "manual" ? <HealthPill status={s.health.status} latencyMs={s.health.latencyMs} /> : null}
              {env && EnvIcon ? (
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold", TONES[env.tone].soft)}>
                  <EnvIcon className="h-3.5 w-3.5" aria-hidden />
                  {t(`environment.${s.integration.environment}`)}
                </span>
              ) : null}
              <span className={cn("rounded-full px-2.5 py-1 text-[11.5px] font-semibold", s.isActive ? TONES.emerald.soft : TONES.zinc.soft)}>
                {s.isActive ? t("status.active") : t("status.inactive")}
              </span>
            </div>
            <h1 className="mt-2 text-start text-[24px] font-semibold leading-tight tracking-tight text-zinc-950 sm:text-[28px]">
              <bdi>{primary}</bdi>
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-medium text-zinc-500">
              <span className="font-mono text-[12.5px] text-zinc-600" dir="ltr">
                {s.code}
              </span>
              {secondary ? <bdi>{secondary}</bdi> : null}
            </div>
            <div className="mt-2.5">
              <AvailabilityBadges availability={s.availability} />
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map(({ icon: Icon, tone: statTone, label, value, id }) => (
            <div key={id} className={cn("rounded-[22px] bg-gradient-to-br p-3 ring-1 ring-inset ring-zinc-900/[0.04]", TONES[statTone].tint)} data-testid={`supplier-stat-${id}`}>
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", TONES[statTone].solid)} aria-hidden>
                <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
              </span>
              <p className="mt-2 truncate text-[19px] font-semibold leading-none tabular-nums text-zinc-950">{value}</p>
              <p className="mt-1 truncate text-[11.5px] font-medium text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
        {funds.limited ? (
          <div className="mt-3">
            <FundingBar pct={fundingPct(fi)} exhausted={exhausted} low={low} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
