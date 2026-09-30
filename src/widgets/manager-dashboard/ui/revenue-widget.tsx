"use client";

import { useTranslations } from "next-intl";
import {
  AlarmClock,
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  Hourglass,
  Package,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { MoneyStat, RevenueSummary } from "@/entities/dashboard";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { TONES, type Tone } from "@/shared/ui";
import { formatCompactMinor } from "./money";
import { RevenueSparkline } from "./revenue-sparkline";

const METHOD_TONES: Tone[] = ["emerald", "sky", "violet", "amber", "rose", "indigo", "teal"];
const KNOWN_METHODS = ["cash", "card", "transfer", "bank_transfer", "online", "cheque", "other"];

type Props = { revenue: RevenueSummary; locale: string; periodDays: number };

type Tile = {
  key: string;
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  hint: string;
  muted?: boolean;
};

/** Finance-ledger revenue in the branch reporting currency. */
export function RevenueWidget({ revenue, locale, periodDays }: Props) {
  const t = useTranslations("manager.revenue");
  const cur = revenue.currency;
  const money = (minor: number) => formatCompactMinor(minor, locale);
  const withCount = (stat: MoneyStat, key: string) => t(key, { count: stat.count });

  const tiles: Tile[] = [
    { key: "booked", icon: Package, tone: "sky", label: t("booked"), value: money(revenue.booked.amount), hint: withCount(revenue.booked, "bookedHint") },
    revenue.margin === null
      ? { key: "margin", icon: TrendingUp, tone: "violet", label: t("margin"), value: "—", hint: t("marginMissing"), muted: true }
      : {
          key: "margin",
          icon: TrendingUp,
          tone: "violet",
          label: t("margin"),
          value: money(revenue.margin),
          hint: t("marginHint", { pct: revenue.marginPct ?? 0, count: revenue.costedBookings }),
        },
    { key: "outstanding", icon: Hourglass, tone: "amber", label: t("outstanding"), value: money(revenue.outstanding.amount), hint: withCount(revenue.outstanding, "outstandingHint") },
    { key: "overdue", icon: AlarmClock, tone: "rose", label: t("overdue"), value: money(revenue.overdue.amount), hint: withCount(revenue.overdue, "instalmentsHint") },
    { key: "dueSoon", icon: CalendarClock, tone: "indigo", label: t("dueSoon"), value: money(revenue.dueSoon.amount), hint: withCount(revenue.dueSoon, "instalmentsHint") },
    { key: "pending", icon: ShieldCheck, tone: "teal", label: t("pending"), value: money(revenue.pendingVerification.amount), hint: withCount(revenue.pendingVerification, "paymentsHint") },
  ];

  const collection = revenue.collectionPct;
  const methodsTotal = revenue.methods.reduce((sum, m) => sum + Math.max(m.amount, 0), 0);
  const methodLabel = (m: string) => (KNOWN_METHODS.includes(m) ? t(`methodNames.${m}`) : m.charAt(0).toUpperCase() + m.slice(1));

  return (
    <section
      className="flex h-full flex-col gap-5 rounded-[28px] border border-zinc-200/60 bg-white p-5 shadow-[0_10px_34px_-24px_rgba(15,23,42,0.35)] sm:p-6"
      data-testid="manager-revenue"
    >
      <header className="flex items-center gap-3">
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]", TONES.teal.gradient)}>
          <Banknote className="h-6 w-6" strokeWidth={1.9} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[17px] font-semibold tracking-tight text-zinc-950">{t("title")}</h2>
          <p className="truncate text-xs font-medium text-zinc-500">{t("subtitle", { currency: cur })}</p>
        </div>
        <Link
          href={routes.finance}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
        >
          {t("openFinance")}
          <ArrowUpRight className="h-3.5 w-3.5 rtl:-scale-x-100" strokeWidth={2.25} />
        </Link>
      </header>

      <div className="grid gap-5 rounded-[22px] bg-gradient-to-br from-teal-50/80 via-white to-emerald-50/60 p-4 ring-1 ring-inset ring-teal-900/[0.04] md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:items-center">
        <div className="min-w-0 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700/80">{t("netCollected")}</p>
            <p className="mt-1 truncate text-[34px] font-semibold leading-none tracking-tight text-zinc-950 tabular-nums">
              {money(revenue.netCollected)}
              <span className="ms-1.5 text-base font-semibold text-zinc-400">{cur}</span>
            </p>
            <p className="mt-2 text-xs font-medium text-zinc-500">
              {t("grossRefunds", {
                gross: `${money(revenue.collected.amount)} ${cur}`,
                refunds: `${money(revenue.refunds.amount)} ${cur}`,
              })}
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-inset ring-teal-900/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-[width] duration-700"
                style={{ width: `${Math.min(Math.max(collection ?? 0, 0), 100)}%` }}
              />
            </div>
            <p className="text-xs font-semibold text-zinc-600">
              {collection === null ? t("collectionNone") : t("collectionRate", { pct: collection })}
            </p>
          </div>
        </div>
        <div className="min-w-0">
          <RevenueSparkline points={revenue.series} label={t("trend", { days: periodDays })} />
          <p className="mt-1 text-end text-[11px] font-medium text-zinc-400">{t("trend", { days: periodDays })}</p>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((tile) => (
          <li
            key={tile.key}
            className={cn("rounded-[20px] bg-gradient-to-br p-3.5 ring-1 ring-inset ring-zinc-900/[0.03]", TONES[tile.tone].tint)}
            data-testid={`revenue-${tile.key}`}
          >
            <span className={cn("flex h-11 w-11 items-center justify-center rounded-[15px]", TONES[tile.tone].gradient)}>
              <tile.icon className="h-[22px] w-[22px]" strokeWidth={1.9} />
            </span>
            <p className="mt-3 truncate text-xs font-semibold text-zinc-500">{tile.label}</p>
            <p className={cn("truncate text-xl font-semibold tracking-tight tabular-nums", tile.muted ? "text-zinc-300" : "text-zinc-950")}>
              {tile.value}
              {!tile.muted ? <span className="ms-1 text-[11px] font-semibold text-zinc-400">{cur}</span> : null}
            </p>
            <p className="truncate text-[11px] font-medium text-zinc-400">{tile.hint}</p>
          </li>
        ))}
      </ul>

      {revenue.methods.length && methodsTotal > 0 ? (
        <div className="space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{t("methods")}</p>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-zinc-100">
            {revenue.methods.map((m, i) =>
              m.amount > 0 ? (
                <span
                  key={m.method}
                  className={cn("h-full", TONES[METHOD_TONES[i % METHOD_TONES.length]].dot)}
                  style={{ width: `${(m.amount / methodsTotal) * 100}%` }}
                />
              ) : null,
            )}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
            {revenue.methods
              .filter((m) => m.amount > 0)
              .map((m) => {
                const tone = METHOD_TONES[revenue.methods.indexOf(m) % METHOD_TONES.length];
                return (
                  <li key={m.method} className="flex items-center gap-1.5 text-xs font-medium text-zinc-600">
                    <span className={cn("h-2 w-2 rounded-full", TONES[tone].dot)} />
                    {methodLabel(m.method)}
                    <span className="font-semibold tabular-nums text-zinc-950">
                      {Math.round((m.amount / methodsTotal) * 100)}%
                    </span>
                  </li>
                );
              })}
          </ul>
        </div>
      ) : null}

      {revenue.unconverted.length ? (
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 px-3.5 py-3 text-xs font-medium text-amber-900" role="status">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" strokeWidth={2} />
          <p className="min-w-0 flex-1">{t("unconverted", { currencies: revenue.unconverted.join(", ") })}</p>
          <Link href={routes.financeFx} className="shrink-0 font-semibold text-amber-700 underline-offset-2 hover:underline">
            {t("addRate")}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
