"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  AlarmClock,
  BadgeAlert,
  CalendarClock,
  Coins,
  Globe2,
  HandCoins,
  PiggyBank,
  RotateCcw,
  ShieldOff,
  WalletMinimal,
  type LucideIcon,
} from "lucide-react";
import { bpsToPercent, type AlertCounts, type Converted, type Overview } from "@/entities/finance";
import { cn } from "@/shared/lib/cn";
import { formatMoneyShort, formatPercent } from "@/shared/lib/format";
import type { ApiQuery } from "@/shared/lib/use-api-query";
import { QueryState, TONES, type Tone } from "@/shared/ui";
import type { FinanceTab } from "../model/use-finance-tab";
import { Bar, CountTile, CURRENCY_TONES } from "./primitives";

type AlertKey = keyof AlertCounts;

const ALERTS: { key: AlertKey; icon: LucideIcon; tone: Tone; tab: FinanceTab }[] = [
  { key: "unmatchedCredits", icon: HandCoins, tone: "amber", tab: "treasury" },
  { key: "lowDeposits", icon: PiggyBank, tone: "rose", tab: "payables" },
  { key: "supplierDueSoon", icon: CalendarClock, tone: "violet", tab: "payables" },
  { key: "suspendedAgencies", icon: ShieldOff, tone: "zinc", tab: "receivables" },
  { key: "overdueSchedules", icon: AlarmClock, tone: "rose", tab: "queues" },
  { key: "pendingRefunds", icon: RotateCcw, tone: "sky", tab: "queues" },
  { key: "lowAccounts", icon: WalletMinimal, tone: "amber", tab: "treasury" },
];

export function OverviewTab({ query, onOpen }: { query: ApiQuery<Overview>; onOpen: (tab: FinanceTab) => void }) {
  const t = useTranslations("financeHub");
  const o = query.data;
  return (
    <QueryState loading={query.loading && !o} loadingVariant="cards" error={o ? null : query.error} onRetry={() => void query.reload()}>
      {o ? (
        <div className="space-y-5" data-testid="finance-overview">
          <section aria-label={t("overview.alerts")} className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            {ALERTS.map((a) => (
              <CountTile
                key={a.key}
                icon={a.icon}
                tone={a.tone}
                muted={o.alerts[a.key] === 0}
                label={t(`alerts.${a.key}`)}
                count={o.alerts[a.key]}
                onClick={() => onOpen(a.tab)}
                testId={`alert-${a.key}`}
              />
            ))}
          </section>

          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <Trend overview={o} />
            <Exposure overview={o} />
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Breakdown icon={Coins} tone="emerald" title={t("hero.cash")} data={o.cash} currency={o.reportingCurrency} />
            <Breakdown icon={HandCoins} tone="indigo" title={t("overview.receivables")} data={o.receivables} currency={o.reportingCurrency} />
            <Breakdown icon={BadgeAlert} tone="amber" title={t("overview.payables")} data={o.payables} currency={o.reportingCurrency} />
            <Breakdown icon={PiggyBank} tone="sky" title={t("hero.deposits")} data={o.deposits} currency={o.reportingCurrency} />
          </div>
        </div>
      ) : null}
    </QueryState>
  );
}

function Card({ icon: Icon, tone, title, aside, children, testId }: { icon: LucideIcon; tone: Tone; title: string; aside?: React.ReactNode; children: React.ReactNode; testId?: string }) {
  return (
    <section className="rounded-[28px] border border-zinc-200/60 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]" data-testid={testId}>
      <header className="mb-4 flex items-center gap-3">
        <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", TONES[tone].soft)} aria-hidden>
          <Icon className="h-[22px] w-[22px]" />
        </span>
        <h3 className="flex-1 text-[16px] font-semibold tracking-tight text-zinc-950">{title}</h3>
        {aside}
      </header>
      {children}
    </section>
  );
}

function Trend({ overview: o }: { overview: Overview }) {
  const t = useTranslations("financeHub");
  const locale = useLocale();
  const max = Math.max(1, ...o.trend.map((m) => m.revenue));
  const monthLabel = (m: string) => new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(`${m}-01T00:00:00Z`));
  return (
    <Card icon={CalendarClock} tone="violet" title={t("overview.trend")} testId="finance-trend">
      {o.trend.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-zinc-400">{t("overview.noTrend")}</p>
      ) : (
        <>
          <div className="flex h-48 items-end gap-3" role="img" aria-label={t("overview.trend")}>
            {o.trend.map((m) => {
              const rh = Math.max(3, (m.revenue / max) * 100);
              const mh = Math.max(0, (Math.max(0, m.margin) / max) * 100);
              return (
                <div key={m.month} className="group flex h-full flex-1 flex-col items-center justify-end gap-2" title={`${formatMoneyShort(m.revenue, locale, o.reportingCurrency)} · ${formatMoneyShort(m.margin, locale, o.reportingCurrency)}`}>
                  <div className="relative flex w-full max-w-[56px] flex-1 items-end">
                    <div className="w-full rounded-[14px] bg-violet-100 transition group-hover:bg-violet-200" style={{ height: `${rh}%` }} />
                    <div className="absolute inset-x-1.5 bottom-0 rounded-[10px] bg-gradient-to-t from-violet-600 to-fuchsia-400" style={{ height: `${mh}%` }} />
                  </div>
                  <span className="text-[11.5px] font-semibold text-zinc-500">{monthLabel(m.month)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-[12px] font-medium text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-200" />
              {t("overview.revenue")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-600" />
              {t("overview.margin")}
            </span>
            <span className="ms-auto tabular-nums">
              {t("overview.marginRate", { pct: formatPercent(bpsToPercent(o.monthMarginBps), locale) })}
            </span>
          </div>
        </>
      )}
    </Card>
  );
}

function Exposure({ overview: o }: { overview: Overview }) {
  const t = useTranslations("financeHub");
  const locale = useLocale();
  const max = Math.max(1, ...o.exposure.map((e) => Math.abs(e.converted)));
  return (
    <Card icon={Globe2} tone="sky" title={t("overview.exposure")} testId="finance-exposure">
      {o.exposure.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-zinc-400">{t("overview.noExposure")}</p>
      ) : (
        <div className="space-y-4">
          {o.exposure.map((e, i) => (
            <Bar
              key={e.currency}
              label={
                <span className="flex items-center gap-2">
                  <span className="rounded-lg bg-zinc-100 px-1.5 py-0.5 text-[11px] font-bold text-zinc-600">{e.currency}</span>
                  {e.unconverted ? t("overview.noRate") : formatPercent(bpsToPercent(e.shareBps), locale)}
                </span>
              }
              value={e.converted}
              max={max}
              tone={CURRENCY_TONES[i % CURRENCY_TONES.length]}
              display={formatMoneyShort(e.amount, locale, e.currency)}
            />
          ))}
          <p className="text-[12px] text-zinc-400">{t("overview.exposureHint")}</p>
        </div>
      )}
    </Card>
  );
}

function Breakdown({ icon, tone, title, data, currency }: { icon: LucideIcon; tone: Tone; title: string; data: Converted; currency: string }) {
  const t = useTranslations("financeHub");
  const locale = useLocale();
  return (
    <Card icon={icon} tone={tone} title={title} aside={<span className="text-[15px] font-bold tabular-nums text-zinc-900">{formatMoneyShort(data.total, locale, currency)}</span>}>
      {data.items.length === 0 ? (
        <p className="text-[13px] text-zinc-400">{t("overview.nothing")}</p>
      ) : (
        <ul className="space-y-2.5">
          {data.items.map((m) => (
            <li key={m.currency} className="flex items-center justify-between gap-3 text-[13px]">
              <span className="flex items-center gap-2 text-zinc-500">
                <span className="rounded-lg bg-zinc-100 px-1.5 py-0.5 text-[11px] font-bold text-zinc-600">{m.currency}</span>
                {t("overview.items", { count: m.count })}
              </span>
              <span className="font-semibold tabular-nums text-zinc-900">{formatMoneyShort(m.amount, locale, m.currency)}</span>
            </li>
          ))}
        </ul>
      )}
      {data.partial ? <p className="mt-3 text-[11.5px] font-medium text-amber-700">{t("hero.partial")}</p> : null}
    </Card>
  );
}
