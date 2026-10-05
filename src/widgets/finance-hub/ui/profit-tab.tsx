"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, CalendarDays, Package, SlidersHorizontal, Target, Ticket, TrendingDown, TrendingUp, UserRoundCheck } from "lucide-react";
import { bpsToPercent, refCode, type DepartureProfit, type FinanceRepository, type PnL } from "@/entities/finance";
import { useCan } from "@/entities/viewer";
import { BudgetDialog, RatesDialog } from "@/features/finance-profit";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { formatDay, formatMoney, formatMoneyShort, formatPercent } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { Button, IconInput, InitialsAvatar, QueryState, SegmentedControl } from "@/shared/ui";
import { MoneyRow, Pill } from "./primitives";
import { Section } from "./section";

type View = "bookings" | "packages" | "reps";

export function ProfitTab({ repository }: { repository: FinanceRepository }) {
  const t = useTranslations("financeHub");
  const locale = useLocale();
  const canWrite = useCan("payments.write");
  const canApprove = useCan("payments.approve");
  const [range, setRange] = useState<{ from?: string; to?: string }>({});
  const [view, setView] = useState<View>("packages");
  const [budgetFor, setBudgetFor] = useState<DepartureProfit | null>(null);
  const [ratesOpen, setRatesOpen] = useState(false);
  const q = useApiQuery(() => repository.profitability(range), [repository, range.from, range.to], { cacheKey: ["finance", "profit", range.from, range.to] });
  const settings = useApiQuery(() => repository.settings(), [repository], { cacheKey: ["finance", "settings"] });
  const data = q.data;
  const totals = useMemo(() => sumByCurrency(data?.bookings.map((b) => ({ currency: b.currency, pnl: b.pnl })) ?? []), [data]);
  const pct = (bps: number) => formatPercent(bpsToPercent(bps), locale);

  return (
    <div className="space-y-5" data-testid="finance-profit">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1">
          <span className="block text-[12px] font-semibold text-zinc-500">{t("profit.from")}</span>
          <IconInput icon={CalendarDays} type="date" value={range.from ?? data?.from ?? ""} max={range.to ?? data?.to} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value || undefined }))} className="h-11 w-[180px]" />
        </label>
        <label className="space-y-1">
          <span className="block text-[12px] font-semibold text-zinc-500">{t("profit.to")}</span>
          <IconInput icon={CalendarDays} type="date" value={range.to ?? data?.to ?? ""} min={range.from ?? data?.from} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value || undefined }))} className="h-11 w-[180px]" />
        </label>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {settings.data ? (
            <Pill tone="violet" icon={UserRoundCheck}>
              {t("profit.commissionPill", { pct: pct(settings.data.commissionBps) })}
            </Pill>
          ) : null}
          {canApprove && settings.data ? (
            <Button variant="secondary" onClick={() => setRatesOpen(true)} data-testid="finance-rates">
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              {t("profit.rates")}
            </Button>
          ) : null}
        </div>
      </div>

      <QueryState loading={q.loading} loadingVariant="cards" error={q.error} onRetry={() => void q.reload()}>
        {data ? (
          <>
            <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
              {totals.length === 0 ? (
                <p className="col-span-full py-6 text-center text-[13px] text-zinc-400">{t("profit.noBookings")}</p>
              ) : (
                totals.map((x) => (
                  <div key={x.currency} className="rounded-[26px] border border-zinc-200/60 bg-gradient-to-br from-violet-50 via-white to-white p-5" data-testid="profit-total">
                    <div className="flex items-center justify-between">
                      <span className="rounded-lg bg-white px-2 py-0.5 text-[12px] font-bold text-zinc-600 shadow-sm">{x.currency}</span>
                      <Pill tone={x.margin >= 0 ? "emerald" : "rose"} icon={x.margin >= 0 ? TrendingUp : TrendingDown}>
                        {x.revenue ? formatPercent((x.margin / x.revenue) * 100, locale) : "–"}
                      </Pill>
                    </div>
                    <div className="mt-3 text-[24px] font-semibold tracking-tight tabular-nums text-zinc-950">{formatMoneyShort(x.margin, locale, x.currency)}</div>
                    <div className="text-[12.5px] text-zinc-500">{t("profit.ofRevenue", { amount: formatMoneyShort(x.revenue, locale, x.currency) })}</div>
                  </div>
                ))
              )}
            </div>

            <Section
              icon={view === "bookings" ? Ticket : view === "packages" ? Package : UserRoundCheck}
              tone="violet"
              title={t(`profit.view.${view}`)}
              subtitle={t(`profit.viewHint.${view}`)}
              actions={
                <SegmentedControl
                  aria-label={t("tabs.profit")}
                  value={view}
                  onChange={setView}
                  options={[
                    { value: "packages", label: t("profit.view.packages"), icon: Package },
                    { value: "bookings", label: t("profit.view.bookings"), icon: Ticket },
                    { value: "reps", label: t("profit.view.reps"), icon: UserRoundCheck },
                  ]}
                />
              }
            >
              {view === "bookings" ? (
                data.bookings.length === 0 ? (
                  <Empty text={t("profit.noBookings")} />
                ) : (
                  <ul className="divide-y divide-zinc-100">
                    {data.bookings.map((b) => (
                      <MoneyRow
                        key={b.bookingId}
                        icon={Ticket}
                        tone={b.pnl.costed ? (b.pnl.margin >= 0 ? "emerald" : "rose") : "zinc"}
                        title={
                          <span className="flex items-center gap-2">
                            <Link href={routes.booking(b.bookingId)} className="tabular-nums hover:underline">
                              {refCode(b.refNo)}
                            </Link>
                            <span className="truncate font-medium text-zinc-500">{b.customerName}</span>
                            {!b.pnl.costed ? <Pill tone="amber">{t("profit.uncosted")}</Pill> : null}
                          </span>
                        }
                        subtitle={`${b.ownerName || "—"} · ${t("profit.revenueShort", { amount: formatMoney(b.pnl.revenue, locale, b.currency) })}`}
                        amount={formatMoney(b.pnl.margin, locale, b.currency)}
                        amountTone={!b.pnl.costed ? "muted" : b.pnl.margin >= 0 ? "positive" : "negative"}
                        amountHint={pct(b.pnl.marginBps)}
                      />
                    ))}
                  </ul>
                )
              ) : null}

              {view === "packages" ? (
                data.departures.length === 0 ? (
                  <Empty text={t("profit.noPackages")} />
                ) : (
                  <div className="grid gap-3.5 lg:grid-cols-2">
                    {data.departures.map((d) => (
                      <DepartureCard key={d.departureId} departure={d} onBudget={canWrite ? () => setBudgetFor(d) : undefined} />
                    ))}
                  </div>
                )
              ) : null}

              {view === "reps" ? (
                data.reps.length === 0 ? (
                  <Empty text={t("profit.noReps")} />
                ) : (
                  <ul className="divide-y divide-zinc-100">
                    {data.reps.map((r) => (
                      <li key={`${r.userId}-${r.currency}`} className="flex items-center gap-3 py-3" data-testid="profit-rep">
                        <InitialsAvatar id={r.userId} name={r.name || "?"} size="md" className="h-11 w-11 rounded-2xl" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-semibold text-zinc-900">{r.name || "—"}</div>
                          <div className="text-[12px] text-zinc-500">
                            {t("profit.repLine", { count: r.bookings, margin: formatMoneyShort(r.pnl.margin, locale, r.currency) })}
                            {r.uncosted > 0 ? ` · ${t("profit.repUncosted", { count: r.uncosted })}` : ""}
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="text-[15px] font-bold tabular-nums text-violet-700">{formatMoney(r.commission, locale, r.currency)}</div>
                          <div className="text-[11.5px] text-zinc-400">{t("profit.commission")}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </Section>
          </>
        ) : null}
      </QueryState>

      {budgetFor ? <BudgetDialog repository={repository} departure={budgetFor} open onOpenChange={(o) => !o && setBudgetFor(null)} onSaved={() => void q.refresh()} /> : null}
      {ratesOpen && settings.data ? (
        <RatesDialog
          repository={repository}
          settings={settings.data}
          open
          onOpenChange={setRatesOpen}
          onSaved={(s) => {
            settings.setData(s);
            void q.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-[13px] text-zinc-400">{text}</p>;
}

function sumByCurrency(rows: { currency: string; pnl: PnL }[]) {
  const m = new Map<string, { currency: string; revenue: number; margin: number }>();
  for (const r of rows) {
    const cur = m.get(r.currency) ?? { currency: r.currency, revenue: 0, margin: 0 };
    cur.revenue += r.pnl.revenue;
    cur.margin += r.pnl.margin;
    m.set(r.currency, cur);
  }
  return [...m.values()];
}

function DepartureCard({ departure: d, onBudget }: { departure: DepartureProfit; onBudget?: () => void }) {
  const t = useTranslations("financeHub");
  const locale = useLocale();
  const b = d.budget;
  const progress = b && b.revenue > 0 ? Math.min(100, Math.round((d.pnl.revenue / b.revenue) * 100)) : null;
  return (
    <div className="rounded-[24px] bg-zinc-50/80 p-4 ring-1 ring-inset ring-zinc-900/[0.04]" data-testid="profit-departure">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700" aria-hidden>
          <Package className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px] font-semibold text-zinc-900">{d.packageName || "—"}</div>
          <div className="text-[12px] text-zinc-500">
            {d.departsOn ? formatDay(d.departsOn, locale) : "—"} · {t("profit.paxLine", { pax: d.pax, count: d.bookings })}
          </div>
        </div>
        {onBudget ? (
          <Button size="sm" variant="secondary" onClick={onBudget} data-testid="profit-budget">
            <Target className="h-4 w-4" aria-hidden />
            {b ? t("profit.editBudget") : t("profit.setBudget")}
          </Button>
        ) : null}
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-[12px]">
        <Figure label={t("overview.revenue")} actual={d.pnl.revenue} plan={b?.revenue} currency={d.currency} />
        <Figure label={t("profit.cost")} actual={d.pnl.revenue - d.pnl.margin} plan={b?.cost} currency={d.currency} invert />
        <Figure label={t("overview.margin")} actual={d.pnl.margin} plan={b?.margin} currency={d.currency} />
      </dl>
      {progress !== null ? (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[11.5px] text-zinc-500">
            <span>{t("profit.budgetReached", { pct: progress })}</span>
            {d.variance?.costOverrun ? <span className="font-semibold text-rose-600">{t("profit.overrun")}</span> : null}
          </div>
        </div>
      ) : b && b.currency !== d.currency ? (
        <p className="mt-2 text-[11.5px] text-amber-700">{t("profit.budgetCurrency", { currency: b.currency })}</p>
      ) : null}
    </div>
  );
}

function Figure({ label, actual, plan, currency, invert }: { label: string; actual: number; plan?: number; currency: string; invert?: boolean }) {
  const locale = useLocale();
  const diff = plan === undefined ? null : actual - plan;
  const good = diff === null ? null : invert ? diff <= 0 : diff >= 0;
  return (
    <div>
      <dt className="text-zinc-400">{label}</dt>
      <dd className="font-semibold tabular-nums text-zinc-900">{formatMoneyShort(actual, locale, currency)}</dd>
      {plan !== undefined ? (
        <dd className={cn("flex items-center gap-0.5 tabular-nums", good ? "text-emerald-600" : "text-rose-600")}>
          <ArrowUpRight className={cn("h-3 w-3", !((diff ?? 0) >= 0) && "rotate-90")} aria-hidden />
          {formatMoneyShort(plan, locale, currency)}
        </dd>
      ) : null}
    </div>
  );
}
