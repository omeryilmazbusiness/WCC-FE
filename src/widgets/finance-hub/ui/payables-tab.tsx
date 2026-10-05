"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, Check, CreditCard, Landmark, PiggyBank, Plane, Scale, Wallet } from "lucide-react";
import { daysBetween, type DueInvoice, type PayableSupplier } from "@/entities/finance";
import type { FinanceTabProps } from "./tab-props";
import { useCan } from "@/entities/viewer";
import { PayInvoicesDialog, TopUpDialog } from "@/features/finance-payables";
import { cn } from "@/shared/lib/cn";
import { formatDay, formatMoney, formatMoneyShort } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { Button, QueryState, TONES, type Tone } from "@/shared/ui";
import { Pill } from "./primitives";
import { Section } from "./section";

type Group = "overdue" | "week" | "later" | "open";
const GROUP_TONE: Record<Group, Tone> = { overdue: "rose", week: "amber", later: "sky", open: "zinc" };

function groupOf(inv: DueInvoice, today: string): Group {
  if (!inv.dueOn) return "open";
  const d = daysBetween(today, inv.dueOn);
  if (d < 0) return "overdue";
  if (d <= 7) return "week";
  return "later";
}

type Dialog = { kind: "pay"; invoices: DueInvoice[] } | { kind: "topup"; supplier: PayableSupplier } | null;

export function PayablesTab({ repository, onChanged }: FinanceTabProps) {
  const t = useTranslations("financeHub");
  const locale = useLocale();
  const canApprove = useCan("payments.approve");
  const q = useApiQuery(() => repository.payables(), [repository], { cacheKey: ["finance", "payables"], liveTopics: ["supplier", "payment"] });
  const accounts = useApiQuery(() => repository.accounts(), [repository], { cacheKey: ["finance", "accounts"], enabled: canApprove });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<Dialog>(null);
  const data = q.data;
  const today = data?.today ?? "";
  const groups = useMemo(() => {
    const out: Record<Group, DueInvoice[]> = { overdue: [], week: [], later: [], open: [] };
    for (const inv of data?.plan ?? []) out[groupOf(inv, today)].push(inv);
    return out;
  }, [data, today]);
  const picked = (data?.plan ?? []).filter((i) => selected.has(i.id));
  const pickedTotals = totalsByCurrency(picked);
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const refresh = () => {
    setSelected(new Set());
    void q.refresh();
    void accounts.refresh();
    onChanged?.();
  };
  const close = (open: boolean) => !open && setDialog(null);

  return (
    <QueryState loading={q.loading} loadingVariant="cards" error={q.error} onRetry={() => void q.reload()}>
      {data ? (
        <div className="space-y-5" data-testid="finance-payables">
          <Section icon={PiggyBank} tone="sky" title={t("payables.suppliers")} subtitle={t("payables.suppliersHint")}>
            {data.suppliers.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-zinc-400">{t("payables.noSuppliers")}</p>
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
                {data.suppliers.map((s) => (
                  <SupplierCard key={s.id} supplier={s} onTopUp={canApprove && s.paymentModel === "prepaid" && s.isActive ? () => setDialog({ kind: "topup", supplier: s }) : undefined} />
                ))}
              </div>
            )}
          </Section>

          <Section
            icon={CalendarClock}
            tone="amber"
            title={t("payables.plan")}
            subtitle={t("payables.planHint")}
            actions={
              canApprove && picked.length > 0 ? (
                <Button onClick={() => setDialog({ kind: "pay", invoices: picked })} disabled={pickedTotals.length > 1} data-testid="finance-pay-selected">
                  <Landmark className="h-4 w-4" aria-hidden />
                  {pickedTotals.length > 1 ? t("payables.oneCurrency") : t("payables.paySelected", { count: picked.length, amount: formatMoney(pickedTotals[0].amount, locale, pickedTotals[0].currency) })}
                </Button>
              ) : null
            }
          >
            {data.plan.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-zinc-400">{t("payables.nothingDue")}</p>
            ) : (
              <div className="space-y-5">
                {(Object.keys(groups) as Group[]).map((g) =>
                  groups[g].length === 0 ? null : (
                    <div key={g}>
                      <div className="mb-2 flex items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 rounded-full", TONES[GROUP_TONE[g]].dot)} />
                        <h4 className="text-[13px] font-semibold text-zinc-700">{t(`payables.group.${g}`)}</h4>
                        <span className="text-[12px] tabular-nums text-zinc-400">
                          {totalsByCurrency(groups[g])
                            .map((x) => formatMoneyShort(x.amount, locale, x.currency))
                            .join(" · ")}
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {groups[g].map((inv) => {
                          const payable = inv.status === "approved";
                          const on = selected.has(inv.id);
                          return (
                            <li key={inv.id} className={cn("flex items-center gap-3 rounded-[20px] p-3 ring-1 ring-inset transition", on ? "bg-amber-50/70 ring-amber-200" : "bg-zinc-50/70 ring-zinc-900/[0.04]")} data-testid="finance-due">
                              {canApprove ? (
                                <button
                                  type="button"
                                  role="checkbox"
                                  aria-checked={on}
                                  aria-label={inv.invoiceNumber}
                                  disabled={!payable}
                                  onClick={() => toggle(inv.id)}
                                  className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition disabled:opacity-30", on ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white")}
                                >
                                  {on ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
                                </button>
                              ) : null}
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[14px] font-semibold text-zinc-900">
                                  {inv.supplierName} <span className="font-medium text-zinc-400">· {inv.invoiceNumber}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[12px] text-zinc-500">
                                  {inv.dueOn ? formatDay(inv.dueOn, locale) : t("payables.noDue")}
                                  {!payable ? <Pill tone="zinc">{t("payables.awaitingApproval")}</Pill> : null}
                                </div>
                              </div>
                              <span className="text-[15px] font-bold tabular-nums text-zinc-900">{formatMoney(inv.amount, locale, inv.currency)}</span>
                              {canApprove && payable ? (
                                <Button size="sm" variant="secondary" onClick={() => setDialog({ kind: "pay", invoices: [inv] })}>
                                  {t("payables.pay")}
                                </Button>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ),
                )}
              </div>
            )}
          </Section>

          {dialog?.kind === "pay" ? <PayInvoicesDialog repository={repository} invoices={dialog.invoices} accounts={accounts.data ?? []} open onOpenChange={close} onDone={refresh} /> : null}
          {dialog?.kind === "topup" ? <TopUpDialog repository={repository} supplier={dialog.supplier} accounts={accounts.data ?? []} open onOpenChange={close} onDone={refresh} /> : null}
        </div>
      ) : null}
    </QueryState>
  );
}

function totalsByCurrency(list: DueInvoice[]): { currency: string; amount: number }[] {
  const m = new Map<string, number>();
  for (const i of list) m.set(i.currency, (m.get(i.currency) ?? 0) + i.amount);
  return [...m].map(([currency, amount]) => ({ currency, amount }));
}

const MODEL_ICON = { prepaid: Wallet, postpaid: Scale, card: CreditCard } as const;

function SupplierCard({ supplier: s, onTopUp }: { supplier: PayableSupplier; onTopUp?: () => void }) {
  const t = useTranslations("financeHub");
  const locale = useLocale();
  const prepaid = s.paymentModel === "prepaid";
  const low = prepaid && s.lowBalanceThreshold > 0 && s.depositBalance < s.lowBalanceThreshold;
  const tone: Tone = low ? "rose" : prepaid ? "sky" : "violet";
  const Icon = MODEL_ICON[s.paymentModel] ?? Plane;
  const headline = prepaid ? s.depositBalance : s.creditUsed;
  const usedPct = !prepaid && s.creditLimit > 0 ? Math.min(100, Math.round((s.creditUsed / s.creditLimit) * 100)) : 0;
  return (
    <div className={cn("flex flex-col rounded-[26px] border border-zinc-200/60 bg-gradient-to-br p-4", TONES[tone].tint, !s.isActive && "opacity-60")} data-testid="finance-supplier">
      <div className="flex items-center gap-3">
        <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", TONES[tone].gradient)} aria-hidden>
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[14.5px] font-semibold text-zinc-900">{s.name}</div>
          <div className="text-[12px] text-zinc-500">{t(`payables.model.${s.paymentModel}`)}</div>
        </div>
      </div>
      <div className="mt-4 text-[11.5px] font-semibold uppercase tracking-wide text-zinc-400">{prepaid ? t("payables.deposit") : t("payables.owed")}</div>
      <div className={cn("text-[22px] font-semibold tabular-nums tracking-tight", low ? "text-rose-600" : "text-zinc-950")}>{formatMoney(headline, locale, s.currency)}</div>
      {prepaid && s.lowBalanceThreshold > 0 ? (
        <div className="mt-1 text-[12px] text-zinc-500">{t("payables.threshold", { amount: formatMoneyShort(s.lowBalanceThreshold, locale, s.currency) })}</div>
      ) : null}
      {!prepaid && s.creditLimit > 0 ? (
        <div className="mt-2">
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div className={cn("h-full rounded-full", usedPct >= 90 ? "bg-rose-500" : "bg-violet-500")} style={{ width: `${usedPct}%` }} />
          </div>
          <div className="mt-1 text-[12px] text-zinc-500">{t("payables.creditOf", { amount: formatMoneyShort(s.creditLimit, locale, s.currency) })}</div>
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {low ? <Pill tone="rose">{t("payables.low")}</Pill> : null}
        {s.openDisputes > 0 ? <Pill tone="amber">{t("payables.disputes", { count: s.openDisputes })}</Pill> : null}
      </div>
      {onTopUp ? (
        <Button size="sm" variant={low ? "default" : "secondary"} className="mt-4 w-full" onClick={onTopUp} data-testid="finance-topup">
          <PiggyBank className="h-4 w-4" aria-hidden />
          {t("payables.topUp")}
        </Button>
      ) : null}
    </div>
  );
}
