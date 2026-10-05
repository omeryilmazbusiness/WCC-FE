"use client";

import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BadgeAlert, Gauge, Plus, RotateCcw, Scale, ShoppingBag, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { DISPUTE_LOOK, lookToBookRatio, type Dispute, type SupplierDetail, type SupplierRepository } from "@/entities/supplier";
import { CloseDisputeDialog, OpenDisputeDialog } from "@/features/supplier-disputes";
import { cn } from "@/shared/lib/cn";
import { formatDateTime, formatMoney, formatMoneyWhole } from "@/shared/lib/format";
import { Button, EmptyState, InfoSection, TONES, type Tone } from "@/shared/ui";

type Props = { detail: SupplierDetail; repository: SupplierRepository; canWrite: boolean; onDispute: (d: Dispute) => void };

export function PerformanceTab({ detail, repository, canWrite, onDispute }: Props) {
  const t = useTranslations("suppliers");
  const locale = useLocale();
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState<Dispute | null>(null);
  const { supplier: s, metrics: m, volume: v, disputes } = detail;
  const cur = s.finance.currency;

  const kpis: { icon: LucideIcon; tone: Tone; label: string; value: ReactNode; id: string }[] = [
    { icon: TrendingUp, tone: "indigo", label: t("performance.turnover"), value: formatMoneyWhole(v.spend, locale, cur), id: "turnover" },
    { icon: ShoppingBag, tone: "sky", label: t("performance.bookings"), value: v.bookings.toLocaleString(locale), id: "bookings" },
    { icon: RotateCcw, tone: "teal", label: t("performance.refunds"), value: formatMoneyWhole(v.refunds, locale, cur), id: "refunds" },
    { icon: TrendingDown, tone: m.failedBookingPct >= 10 ? "rose" : "amber", label: t("metrics.failedBookings"), value: m.bookings + m.errors ? `${m.failedBookingPct}%` : "—", id: "failed" },
    { icon: BadgeAlert, tone: m.errorRatePct >= 5 ? "rose" : "emerald", label: t("metrics.errorRate"), value: m.searches ? `${m.errorRatePct}%` : "—", id: "errors" },
    { icon: Gauge, tone: "violet", label: t("metrics.lookToBook"), value: lookToBookRatio(m.searches, m.bookings) ?? "—", id: "l2b" },
    { icon: Scale, tone: detail.openDisputes ? "amber" : "zinc", label: t("performance.openDisputes"), value: detail.openDisputes, id: "disputes" },
  ];

  return (
    <div className="space-y-4">
      <InfoSection icon={TrendingUp} tone="indigo" title={t("performance.title", { days: m.windowDays })} data-testid="supplier-performance">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-7">
          {kpis.map(({ icon: Icon, tone, label, value, id }) => (
            <div key={id} className={cn("rounded-[22px] bg-gradient-to-br p-3 ring-1 ring-inset ring-zinc-900/[0.04]", TONES[tone].tint)} data-testid={`supplier-kpi-${id}`}>
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", TONES[tone].solid)} aria-hidden>
                <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
              </span>
              <p className="mt-2 truncate text-[19px] font-semibold leading-none tabular-nums text-zinc-950">{value}</p>
              <p className="mt-1 truncate text-[11.5px] font-medium text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
      </InfoSection>

      <InfoSection
        icon={Scale}
        tone="rose"
        title={t("disputes.title")}
        badge={detail.openDisputes ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">{detail.openDisputes}</span> : null}
        action={
          canWrite ? (
            <Button size="sm" onClick={() => setOpening(true)} data-testid="supplier-dispute-new">
              <Plus className="h-4 w-4" aria-hidden />
              {t("disputes.new")}
            </Button>
          ) : null
        }
        data-testid="supplier-disputes"
      >
        {disputes.length === 0 ? (
          <EmptyState icon={Scale} title={t("disputes.empty")} description={t("disputes.emptyHint")} />
        ) : (
          <ul className="divide-y divide-zinc-100">
            {disputes.map((d) => {
              const look = DISPUTE_LOOK[d.status];
              const Icon = look.icon;
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0" data-testid={`supplier-dispute-${d.status}`}>
                  <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", TONES[look.tone].soft)} aria-hidden>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-[14px] font-semibold text-zinc-900">
                      <span className="truncate">{d.title}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-bold", TONES[look.tone].soft)}>{t(`dispute.${d.status}`)}</span>
                    </p>
                    <p className="truncate text-[12px] text-zinc-500">
                      {d.bookingRef ? (
                        <span className="font-mono" dir="ltr">
                          {d.bookingRef} ·{" "}
                        </span>
                      ) : null}
                      {formatDateTime(d.openedAt, locale)}
                      {d.resolution ? ` · ${d.resolution}` : ""}
                    </p>
                  </div>
                  {d.amount ? <p className="text-[15px] font-bold tabular-nums text-zinc-900">{formatMoney(d.amount, locale, d.currency)}</p> : null}
                  {canWrite && d.status === "open" ? (
                    <Button size="sm" variant="outline" onClick={() => setClosing(d)} data-testid="supplier-dispute-close">
                      {t("disputes.close")}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </InfoSection>

      {canWrite ? (
        <>
          <OpenDisputeDialog repository={repository} supplier={s} open={opening} onOpenChange={setOpening} onSaved={onDispute} />
          <CloseDisputeDialog repository={repository} supplierId={s.id} dispute={closing} onOpenChange={(o) => !o && setClosing(null)} onSaved={onDispute} />
        </>
      ) : null}
    </div>
  );
}
