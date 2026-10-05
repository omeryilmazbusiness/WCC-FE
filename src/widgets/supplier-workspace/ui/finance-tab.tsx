"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BellRing, CalendarClock, CreditCard, Landmark, Lock, Plus, Receipt, ShieldCheck, Wallet } from "lucide-react";
import {
  ENTRY_LOOK,
  PAYMENT_LOOK,
  available,
  fundingPct,
  isExhausted,
  isLowBalance,
  type LedgerEntry,
  type Supplier,
  type SupplierDetail,
  type SupplierRepository,
} from "@/entities/supplier";
import { PostEntryDialog } from "@/features/supplier-ledger";
import { cn } from "@/shared/lib/cn";
import { formatDateTime, formatMoney } from "@/shared/lib/format";
import { Button, EmptyState, InfoRow, InfoSection, ProgressRing, TONES } from "@/shared/ui";

type Props = {
  detail: SupplierDetail;
  repository: SupplierRepository;
  canFinance: boolean;
  onPosted: (entry: LedgerEntry, supplier: Supplier) => void;
};

export function FinanceTab({ detail, repository, canFinance, onPosted }: Props) {
  const t = useTranslations("suppliers");
  const locale = useLocale();
  const [posting, setPosting] = useState(false);
  const { supplier: s, ledger, canViewLedger } = detail;
  const fi = s.finance;
  const funds = available(fi);
  const exhausted = isExhausted(fi);
  const low = isLowBalance(fi);
  const pay = PAYMENT_LOOK[fi.paymentModel];
  const money = (v: number) => formatMoney(v, locale, fi.currency);
  const pct = fundingPct(fi);
  const ringTone = exhausted ? "rose" : low ? "amber" : "emerald";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <InfoSection icon={pay.icon} tone={pay.tone} title={t(`payment.${fi.paymentModel}.label`)} data-testid="supplier-funds">
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            {funds.limited ? (
              <ProgressRing
                value={pct}
                size={152}
                thickness={14}
                tone={ringTone}
                aria-label={t("financeTab.headroom")}
                label={
                  <span className="text-center">
                    <span className={cn("block text-[19px] font-bold tabular-nums", exhausted ? "text-rose-600" : "text-zinc-950")}>{formatMoney(funds.amount, locale, fi.currency)}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{t("financeTab.available")}</span>
                  </span>
                }
              />
            ) : (
              <span className={cn("flex h-[152px] w-[152px] shrink-0 flex-col items-center justify-center rounded-full", TONES.violet.tint, "bg-gradient-to-br ring-1 ring-inset ring-violet-100")}>
                <CreditCard className="h-10 w-10 text-violet-500" aria-hidden />
                <span className="mt-1 text-[12px] font-semibold text-violet-700">{t("card.unlimited")}</span>
              </span>
            )}
            <div className="w-full min-w-0 flex-1 divide-y divide-zinc-100">
              {fi.paymentModel === "prepaid" ? (
                <InfoRow icon={Wallet} tone="emerald" label={t("financeTab.deposit")} value={<span className="tabular-nums">{money(fi.depositBalance)}</span>} />
              ) : null}
              {fi.paymentModel === "postpaid" ? (
                <>
                  <InfoRow icon={Landmark} tone="indigo" label={t("form.finance.creditLimit")} value={<span className="tabular-nums">{fi.creditLimit ? money(fi.creditLimit) : t("card.unlimited")}</span>} />
                  <InfoRow icon={Receipt} tone="amber" label={t("financeTab.outstanding")} value={<span className="tabular-nums">{money(fi.creditUsed)}</span>} />
                </>
              ) : null}
              {fi.paymentModel !== "card" ? (
                <InfoRow
                  icon={BellRing}
                  tone={low || exhausted ? "rose" : "sky"}
                  label={t("form.finance.threshold")}
                  value={<span className="tabular-nums">{fi.lowBalanceThreshold ? money(fi.lowBalanceThreshold) : t("notSet")}</span>}
                  hint={t("financeTab.thresholdHint")}
                />
              ) : (
                <InfoRow icon={CreditCard} tone="violet" label={t("payment.card.label")} value={t("payment.card.hint")} />
              )}
              <InfoRow icon={CalendarClock} tone="teal" label={t("form.finance.terms")} value={t(`terms.${fi.paymentTerms}`)} />
            </div>
          </div>
          {exhausted ? (
            <p className="mt-4 rounded-2xl bg-rose-50 px-3.5 py-2.5 text-[13px] font-semibold text-rose-700" data-testid="supplier-exhausted">
              {t("financeTab.exhausted")}
            </p>
          ) : low ? (
            <p className="mt-4 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-[13px] font-semibold text-amber-800">{t("financeTab.low")}</p>
          ) : null}
        </InfoSection>

        <InfoSection icon={ShieldCheck} tone="sky" title={t("financeTab.guardTitle")}>
          <ul className="space-y-3 text-[13px] text-zinc-600">
            <li className="flex gap-2.5">
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", TONES.rose.soft)} aria-hidden>
                <Lock className="h-4 w-4" />
              </span>
              <span>{t("financeTab.guardClose")}</span>
            </li>
            <li className="flex gap-2.5">
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", TONES.amber.soft)} aria-hidden>
                <BellRing className="h-4 w-4" />
              </span>
              <span>{t("financeTab.guardAlert")}</span>
            </li>
            <li className="flex gap-2.5">
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", TONES.emerald.soft)} aria-hidden>
                <Receipt className="h-4 w-4" />
              </span>
              <span>{t("financeTab.guardLedger")}</span>
            </li>
          </ul>
        </InfoSection>
      </div>

      <InfoSection
        icon={Receipt}
        tone="emerald"
        title={t("ledger.title")}
        badge={canViewLedger && ledger.length ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">{ledger.length}</span> : null}
        action={
          canFinance ? (
            <Button size="sm" onClick={() => setPosting(true)} data-testid="supplier-ledger-new">
              <Plus className="h-4 w-4" aria-hidden />
              {t("ledger.new")}
            </Button>
          ) : null
        }
        data-testid="supplier-ledger"
      >
        {!canViewLedger ? (
          <EmptyState icon={Lock} title={t("ledger.restricted")} description={t("ledger.restrictedHint")} />
        ) : ledger.length === 0 ? (
          <EmptyState icon={Receipt} title={t("ledger.empty")} description={t("ledger.emptyHint")} />
        ) : (
          <ul className="divide-y divide-zinc-100">
            {ledger.map((e) => {
              const look = ENTRY_LOOK[e.kind];
              const Icon = look.icon;
              const credit = e.kind === "topup" || e.kind === "refund" || e.kind === "payment" || (e.kind === "adjustment" && e.amount > 0);
              return (
                <li key={e.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" data-testid={`ledger-${e.kind}`}>
                  <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", TONES[look.tone].soft)} aria-hidden>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-[14px] font-semibold text-zinc-900">
                      {t(`entry.${e.kind}.label`)}
                      {e.reference ? (
                        <span className="truncate font-mono text-[11.5px] font-medium text-zinc-400" dir="ltr">
                          {e.reference}
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-[12px] text-zinc-500">
                      {formatDateTime(e.createdAt, locale)}
                      {e.note ? ` · ${e.note}` : ""}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className={cn("text-[15px] font-bold tabular-nums", credit ? "text-emerald-600" : "text-zinc-900")}>
                      {credit ? "+" : "−"}
                      {formatMoney(Math.abs(e.amount), locale, e.currency)}
                    </p>
                    <p className="text-[11.5px] tabular-nums text-zinc-400">{t("ledger.balanceAfter", { amount: formatMoney(e.balanceAfter, locale, e.currency) })}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </InfoSection>

      {canFinance ? (
        <PostEntryDialog repository={repository} supplier={s} open={posting} onOpenChange={setPosting} onPosted={({ entry, supplier }) => onPosted(entry, supplier)} />
      ) : null}
    </div>
  );
}
