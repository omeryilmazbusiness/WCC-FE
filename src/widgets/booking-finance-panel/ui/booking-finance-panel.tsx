"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  createPaymentRepository,
  type FinancialSummary,
  type Payment,
  type PaymentRepository,
  type PaymentSchedule,
} from "@/entities/payment";
import { Button, Input, Label, useToast } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

type Props = {
  bookingId: string;
  currency?: string;
  repository?: PaymentRepository;
  onChanged?: () => void;
};

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(0)} ${currency}`;
  }
}

export function BookingFinancePanel({
  bookingId,
  currency = "SAR",
  repository,
  onChanged,
}: Props) {
  const repo = useMemo(
    () => repository ?? createPaymentRepository(),
    [repository],
  );
  const t = useTranslations("finance");
  const { push } = useToast();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("card");
  const [dueAt, setDueAt] = useState("");
  const [schedAmount, setSchedAmount] = useState("");
  const [refundAmt, setRefundAmt] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [s, p, sc] = await Promise.all([
      repo.summary(bookingId),
      repo.listByBooking(bookingId),
      repo.listSchedules(bookingId),
    ]);
    setSummary(s);
    setPayments(p);
    setSchedules(sc);
  }, [bookingId, repo]);

  useEffect(() => {
    void refresh().catch(() => {
      push({ title: t("loadError"), tone: "error" });
    });
  }, [refresh, push, t]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await refresh();
      onChanged?.();
      push({ title: t("saved"), tone: "success" });
    } catch {
      push({ title: t("actionError"), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  const cur = summary?.currency ?? currency;

  return (
    <div className="space-y-8" data-testid="booking-finance-panel">
      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["booked", summary.booked],
              ["collected", summary.collected],
              ["recognized", summary.recognized],
              ["margin", summary.margin],
              ["balance", summary.balance],
              ["credit", summary.credit],
            ] as const
          ).map(([key, val]) => (
            <div key={key} className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                {t(`metrics.${key}`)}
              </p>
              <p className="text-xl font-semibold text-zinc-900">
                {money(val, summary.reportingCurrency || cur)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-zinc-900">{t("recordTitle")}</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label>{t("amount")}</Label>
            <Input
              className="h-10 w-36"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("method")}</Label>
            <Input
              className="h-10 w-36"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            />
          </div>
          <Button
            disabled={busy}
            className="h-10"
            onClick={() =>
              void run(() =>
                repo.record({
                  bookingId,
                  amount: Math.round(Number(amount) * 100),
                  currency: cur,
                  method,
                }),
              )
            }
          >
            {t("record")}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-zinc-900">{t("ledgerTitle")}</h3>
        <ul className="space-y-3">
          {payments.length === 0 ? (
            <li className="text-sm text-zinc-400">{t("ledgerEmpty")}</li>
          ) : (
            payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="text-[15px] font-medium text-zinc-900">
                    {money(p.amount, p.currency)} · {p.eventType}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {p.status}
                    {p.method ? ` · ${p.method}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {p.status === "unverified" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void run(() => repo.verify(p.id))}
                    >
                      {t("verify")}
                    </Button>
                  ) : null}
                  {p.eventType === "charge" && p.status === "verified" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void run(() => repo.reverse(p.id))}
                    >
                      {t("reverse")}
                    </Button>
                  ) : null}
                  {p.eventType === "refund" && p.status === "pending_approval" ? (
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

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-zinc-900">{t("scheduleTitle")}</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label>{t("dueAt")}</Label>
            <Input
              type="datetime-local"
              className="h-10"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("amount")}</Label>
            <Input
              className="h-10 w-32"
              value={schedAmount}
              onChange={(e) => setSchedAmount(e.target.value)}
            />
          </div>
          <Button
            disabled={busy || !dueAt}
            className="h-10"
            onClick={() =>
              void run(() =>
                repo.createSchedule(bookingId, {
                  dueAt: new Date(dueAt).toISOString(),
                  amount: Math.round(Number(schedAmount) * 100),
                  currency: cur,
                }),
              )
            }
          >
            {t("addSchedule")}
          </Button>
        </div>
        <ul className="space-y-2">
          {schedules.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3">
              <p className="text-[15px] text-zinc-700">
                {money(s.amount, s.currency)} · {s.status} ·{" "}
                {new Date(s.dueAt).toLocaleString()}
              </p>
              {s.status === "open" ? (
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

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-zinc-900">{t("refundTitle")}</h3>
        <div className="flex flex-wrap items-end gap-3">
          <Input
            className="h-10 w-36"
            value={refundAmt}
            onChange={(e) => setRefundAmt(e.target.value)}
            placeholder="100"
          />
          <Button
            disabled={busy}
            variant="secondary"
            className="h-10"
            onClick={() =>
              void run(() =>
                repo.requestRefund(
                  bookingId,
                  Math.round(Number(refundAmt) * 100),
                ),
              )
            }
          >
            {t("requestRefund")}
          </Button>
        </div>
        <p className={cn("text-sm text-zinc-400")}>{t("refundHint")}</p>
      </section>
    </div>
  );
}
