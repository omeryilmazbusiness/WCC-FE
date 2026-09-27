"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Booking, BookingRepository } from "@/entities/booking";
import {
  createPaymentRepository,
  financeBreakdown,
  PaymentAmount,
  usePaymentErrorFeedback,
  type BreakdownRow,
  type FinancialSummary,
  type PaymentPromise,
  type PaymentRepository,
} from "@/entities/payment";
import { formatFxRate } from "@/entities/fx";
import { useCan } from "@/entities/viewer";
import { EditDiscountDialog } from "@/features/edit-booking-discount";
import {
  CancelPaymentPromiseButton,
  CreatePaymentPromiseDialog,
} from "@/features/manage-payment-promises";
import { RecordPaymentForm } from "@/features/record-payment";
import { cn } from "@/shared/lib/cn";
import { formatDateTime, formatDay, formatMoney } from "@/shared/lib/format";
import { parseMoneyInput } from "@/shared/lib/money";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { Badge, Button, Input, Label, QueryState } from "@/shared/ui";

type Props = {
  booking: Booking;
  bookingRepository?: BookingRepository;
  repository?: PaymentRepository;
  onChanged?: () => void;
};

const PROMISE_TONES: Record<PaymentPromise["status"], string> = {
  open: "bg-sky-50 text-sky-800",
  kept: "bg-emerald-50 text-emerald-800",
  broken: "bg-rose-50 text-rose-800",
  cancelled: "bg-zinc-100 text-zinc-600",
};

export function BookingFinancePanel({ booking, bookingRepository, repository, onChanged }: Props) {
  const [repo] = useState(() => repository ?? createPaymentRepository());
  const t = useTranslations("finance");
  const locale = useLocale();
  const money = (amount: number, currency: string) => formatMoney(amount, locale, currency);
  const feedback = usePaymentErrorFeedback();
  const canWrite = useCan("payments.write");
  const canApprove = useCan("payments.approve");
  const [dueAt, setDueAt] = useState("");
  const [schedAmount, setSchedAmount] = useState("");
  const [refundAmt, setRefundAmt] = useState("");
  const [busy, setBusy] = useState(false);
  const bookingId = booking.id;

  const query = useApiQuery(async () => {
    const [summary, payments, schedules, promises] = await Promise.all([
      repo.summary(bookingId),
      repo.listByBooking(bookingId),
      repo.listSchedules(bookingId),
      repo.listPromises(bookingId),
    ]);
    return { summary, payments, schedules, promises };
  }, [bookingId, repo]);

  async function refreshAll() {
    await query.reload();
    onChanged?.();
  }

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await refreshAll();
      feedback.success(t("saved"));
    } catch (err) {
      feedback.error(err, t("actionError"));
    } finally {
      setBusy(false);
    }
  }

  if (!query.data) {
    return (
      <div data-testid="booking-finance-panel">
        <QueryState
          loading={query.loading}
          error={query.error}
          errorTitle={t("loadError")}
          onRetry={() => void query.reload()}
        >
          {null}
        </QueryState>
      </div>
    );
  }

  const { summary, payments, schedules, promises } = query.data;
  const cur = summary.currency || booking.currency;
  const schedMinor = parseMoneyInput(schedAmount);
  const refundMinor = parseMoneyInput(refundAmt);

  return (
    <div className="space-y-8" data-testid="booking-finance-panel">
      <Breakdown
        summary={summary}
        discountAction={
          bookingRepository ? (
            <EditDiscountDialog
              booking={booking}
              repository={bookingRepository}
              onSaved={() => void refreshAll()}
            />
          ) : null
        }
      />

      {canWrite ? (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-zinc-900">{t("recordTitle")}</h3>
          <RecordPaymentForm
            bookingId={bookingId}
            currency={cur}
            repository={repo}
            onRecorded={() => void refreshAll()}
          />
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-zinc-900">{t("ledgerTitle")}</h3>
        <ul className="space-y-3" data-testid="payment-ledger">
          {payments.length === 0 ? (
            <li className="text-sm text-zinc-400">{t("ledgerEmpty")}</li>
          ) : (
            payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[15px] font-medium text-zinc-900">
                    <PaymentAmount
                      amount={p.amount}
                      currency={p.currency}
                      amountReporting={p.amountReporting}
                      reportingCurrency={p.reportingCurrency}
                      fxMissing={p.fxMissing}
                    />{" "}
                    · {t(`eventTypes.${p.eventType}`)}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {t(`paymentStatus.${p.status}`)}
                    {p.method ? ` · ${p.method}` : ""}
                    {p.receivedAt ? ` · ${t("receivedOn", { date: formatDay(p.receivedAt, locale) })}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {canWrite && p.status === "unverified" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void run(() => repo.verify(p.id))}
                    >
                      {t("verify")}
                    </Button>
                  ) : null}
                  {canWrite && p.eventType === "charge" && p.status === "verified" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void run(() => repo.reverse(p.id))}
                    >
                      {t("reverse")}
                    </Button>
                  ) : null}
                  {canApprove && p.eventType === "refund" && p.status === "pending_approval" ? (
                    <>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => void run(() => repo.approveRefund(p.id))}
                      >
                        {t("approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void run(() => repo.rejectRefund(p.id))}
                      >
                        {t("reject")}
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="space-y-3" data-testid="payment-promises">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">{t("promises.title")}</h3>
            <p className="text-sm text-zinc-500">
              {summary.promises.openCount > 0
                ? t("promises.summary", {
                    count: summary.promises.openCount,
                    amount: money(summary.promises.openAmount, cur),
                    date: summary.promises.nextPromisedOn
                      ? formatDay(summary.promises.nextPromisedOn, locale)
                      : "—",
                  })
                : t("promises.none")}
            </p>
          </div>
          <CreatePaymentPromiseDialog
            bookingId={bookingId}
            currency={cur}
            repository={repo}
            onCreated={() => void refreshAll()}
          />
        </div>
        {promises.length > 0 ? (
          <ul className="divide-y divide-zinc-100 rounded-[20px] border border-zinc-200/80 bg-white">
            {promises.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-[15px] font-medium text-zinc-900">
                    <bdi>{money(p.amount, p.currency)}</bdi>
                    <span className="text-sm font-normal text-zinc-500">
                      {t("promises.due", { date: formatDay(p.promisedOn, locale) })}
                    </span>
                    <Badge className={cn("normal-case", PROMISE_TONES[p.status])}>
                      {t(`promises.status.${p.status}`)}
                    </Badge>
                  </p>
                  {p.note ? <p className="mt-0.5 truncate text-sm text-zinc-500">{p.note}</p> : null}
                </div>
                <CancelPaymentPromiseButton
                  promise={p}
                  repository={repo}
                  onCancelled={() => void refreshAll()}
                />
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-zinc-900">{t("scheduleTitle")}</h3>
        {canWrite ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="schedule-due">{t("dueAt")}</Label>
              <Input
                id="schedule-due"
                type="datetime-local"
                className="h-10"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schedule-amount">{t("amountIn", { currency: cur })}</Label>
              <Input
                id="schedule-amount"
                className="h-10 w-32"
                dir="ltr"
                inputMode="decimal"
                value={schedAmount}
                onChange={(e) => setSchedAmount(e.target.value)}
              />
            </div>
            <Button
              disabled={busy || !dueAt || !schedMinor}
              className="h-10"
              onClick={() =>
                void run(async () => {
                  await repo.createSchedule(bookingId, {
                    dueAt: new Date(dueAt).toISOString(),
                    amount: schedMinor ?? 0,
                    currency: cur,
                  });
                  setDueAt("");
                  setSchedAmount("");
                })
              }
            >
              {t("addSchedule")}
            </Button>
          </div>
        ) : null}
        <ul className="space-y-2">
          {schedules.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3">
              <p className="text-[15px] text-zinc-700">
                <bdi>{money(s.amount, s.currency)}</bdi> · {t(`scheduleStatus.${s.status}`)} ·{" "}
                {formatDateTime(s.dueAt, locale)}
              </p>
              {canWrite && s.status === "open" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void run(() => repo.cancelSchedule(s.id))}
                >
                  {t("cancel")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {canWrite ? (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-zinc-900">{t("refundTitle")}</h3>
          <div className="flex flex-wrap items-end gap-3">
            <Input
              className="h-10 w-36"
              dir="ltr"
              inputMode="decimal"
              aria-label={t("amountIn", { currency: cur })}
              value={refundAmt}
              onChange={(e) => setRefundAmt(e.target.value)}
              placeholder="100"
            />
            <Button
              disabled={busy || !refundMinor}
              variant="secondary"
              className="h-10"
              onClick={() =>
                void run(async () => {
                  await repo.requestRefund(bookingId, refundMinor ?? 0);
                  setRefundAmt("");
                })
              }
            >
              {t("requestRefund")}
            </Button>
          </div>
          <p className="text-sm text-zinc-400">{t("refundHint")}</p>
        </section>
      ) : null}
    </div>
  );

}

function Breakdown({
  summary: s,
  discountAction,
}: {
  summary: FinancialSummary;
  discountAction: React.ReactNode;
}) {
  const t = useTranslations("finance");
  const locale = useLocale();
  const money = (amount: number, currency: string) => formatMoney(amount, locale, currency);
  const breakdown = financeBreakdown(s);
  const reporting = s.reporting;
  const rows = (list: BreakdownRow[]) =>
    list.map((row) => (
      <div
        key={row.key}
        className={cn(
          "flex items-center justify-between gap-3 py-1.5 text-sm",
          row.emphasis && "mt-1 border-t border-zinc-100 pt-2.5 text-[15px] font-semibold text-zinc-950",
        )}
        data-testid={`breakdown-${row.key}`}
      >
        <dt className="flex items-center gap-1 text-zinc-600">
          {t(`breakdown.${row.key}`)}
          {row.key === "discount" ? discountAction : null}
        </dt>
        <dd className={cn("tabular-nums", row.amount < 0 ? "text-rose-700" : "text-zinc-900")}>
          <bdi>{money(row.amount, s.currency)}</bdi>
        </dd>
      </div>
    ));

  return (
    <section className="grid gap-4 lg:grid-cols-3" data-testid="finance-breakdown">
      <dl className="rounded-[20px] border border-zinc-200/80 bg-white p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          {t("breakdown.pricingTitle")}
        </p>
        {rows(breakdown.pricing)}
        {breakdown.mismatch !== 0 ? (
          <p className="mt-2 text-xs text-amber-700">{t("breakdown.mismatch")}</p>
        ) : null}
      </dl>
      <dl className="rounded-[20px] border border-zinc-200/80 bg-white p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          {t("breakdown.collectionTitle")}
        </p>
        {rows(breakdown.collection)}
        {breakdown.profitability.length > 0 ? (
          <div className="mt-3 border-t border-dashed border-zinc-200 pt-2">{rows(breakdown.profitability)}</div>
        ) : null}
      </dl>
      <div className="rounded-[20px] border border-zinc-200/80 bg-zinc-50/60 p-4" data-testid="finance-reporting">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          {t("breakdown.reportingTitle")}
        </p>
        {reporting ? (
          <dl>
            {(["total", "collected", "balance"] as const).map((key) => (
              <div key={key} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                <dt className="text-zinc-600">{t(`breakdown.${key}`)}</dt>
                <dd className="tabular-nums text-zinc-900">
                  <bdi>{money(reporting[key], reporting.currency)}</bdi>
                </dd>
              </div>
            ))}
            <p className="mt-2 text-xs text-zinc-500">
              {t("breakdown.reportingRate", {
                pair: `${s.currency}/${reporting.currency}`,
                rate: formatFxRate(reporting.rate),
                date: reporting.effectiveDate ? formatDay(reporting.effectiveDate, locale) : "—",
              })}
            </p>
          </dl>
        ) : (
          <p className="text-sm text-zinc-500">{t("breakdown.reportingNone")}</p>
        )}
      </div>
    </section>
  );
}
