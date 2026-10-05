"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Building2, Hourglass, Link2, Pencil, Plus, ShieldAlert, UserRound, Users } from "lucide-react";
import {
  AGEING_BUCKETS,
  bucketOf,
  BUCKET_TONE,
  refCode,
  RISK_LOOK,
  type Agency,
  type Ageing,
  type AgeingBucket,
  type Debtor,
} from "@/entities/finance";
import type { FinanceTabProps } from "./tab-props";
import { useCan } from "@/entities/viewer";
import { AgencyDialog, AgencyStatusDialog, AssignAgencyDialog, PaymentLinkDialog } from "@/features/finance-receivables";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { localDay } from "@/shared/lib/day";
import { formatDay, formatMoney, formatMoneyShort } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { Button, IconButton, ProgressRing, QueryState, SegmentedControl, TONES } from "@/shared/ui";
import { MoneyRow, Pill } from "./primitives";
import { Section } from "./section";

type Dialog =
  | { kind: "agency"; agency: Agency | null }
  | { kind: "status"; agency: Agency }
  | { kind: "assign"; debtor: Debtor }
  | { kind: "link"; debtor: Debtor }
  | null;

type Filter = "all" | "overdue" | "b2b";

export function ReceivablesTab({ repository, onChanged }: FinanceTabProps) {
  const t = useTranslations("financeHub");
  const locale = useLocale();
  const canWrite = useCan("payments.write");
  const canApprove = useCan("payments.approve");
  const q = useApiQuery(() => repository.receivables(), [repository], { cacheKey: ["finance", "receivables"], liveTopics: ["payment", "booking"] });
  const [dialog, setDialog] = useState<Dialog>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [bucket, setBucket] = useState<AgeingBucket | null>(null);
  const today = localDay();
  const data = q.data;
  const debtors = useMemo(() => {
    const rows = data?.debtors ?? [];
    return rows.filter((d) => {
      if (filter === "overdue" && d.daysLate <= 0) return false;
      if (filter === "b2b" && !d.agencyId) return false;
      if (bucket && bucketOf(d.dueOn, today) !== bucket) return false;
      return true;
    });
  }, [data, filter, bucket, today]);
  const close = (open: boolean) => !open && setDialog(null);
  const refresh = () => {
    void q.refresh();
    onChanged?.();
  };

  return (
    <QueryState loading={q.loading} loadingVariant="cards" error={q.error} onRetry={() => void q.reload()}>
      {data ? (
        <div className="space-y-5" data-testid="finance-receivables">
          <Section icon={Hourglass} tone="amber" title={t("receivables.ageing")} subtitle={t("receivables.ageingHint")}>
            {data.ageing.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-zinc-400">{t("receivables.nothingDue")}</p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {data.ageing.map((a) => (
                  <AgeingCard key={a.currency} ageing={a} active={bucket} onPick={(b) => setBucket(bucket === b ? null : b)} />
                ))}
              </div>
            )}
          </Section>

          <Section
            icon={Building2}
            tone="indigo"
            title={t("receivables.agencies")}
            subtitle={t("receivables.agenciesHint")}
            actions={
              canApprove ? (
                <Button onClick={() => setDialog({ kind: "agency", agency: null })} data-testid="finance-new-agency">
                  <Plus className="h-4 w-4" aria-hidden />
                  {t("receivables.newAgency")}
                </Button>
              ) : null
            }
          >
            {data.agencies.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-zinc-400">{t("receivables.noAgencies")}</p>
            ) : (
              <div className="grid gap-3.5 md:grid-cols-2 2xl:grid-cols-3">
                {data.agencies.map((a) => (
                  <AgencyCard
                    key={a.id}
                    agency={a}
                    onEdit={canApprove ? () => setDialog({ kind: "agency", agency: a }) : undefined}
                    onStatus={canApprove ? () => setDialog({ kind: "status", agency: a }) : undefined}
                  />
                ))}
              </div>
            )}
          </Section>

          <Section
            icon={Users}
            tone="emerald"
            title={t("receivables.debtors")}
            subtitle={bucket ? t("receivables.bucketFilter", { bucket: t(`bucket.${bucket}`) }) : t("receivables.debtorsHint")}
            actions={
              <SegmentedControl
                aria-label={t("receivables.debtors")}
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "all", label: t("receivables.all") },
                  { value: "overdue", label: t("receivables.overdue") },
                  { value: "b2b", label: t("receivables.b2b") },
                ]}
              />
            }
          >
            {debtors.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-zinc-400">{t("receivables.noDebtors")}</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {debtors.map((d) => (
                  <MoneyRow
                    key={d.bookingId}
                    icon={d.agencyId ? Building2 : UserRound}
                    tone={BUCKET_TONE[bucketOf(d.dueOn, today)]}
                    testId="finance-debtor"
                    title={
                      <span className="flex items-center gap-2">
                        <span className="tabular-nums">{refCode(d.refNo)}</span>
                        <span className="truncate font-medium text-zinc-500">{d.customerName}</span>
                        {d.agencyName ? <Pill tone="indigo">{d.agencyName}</Pill> : null}
                      </span>
                    }
                    subtitle={
                      d.dueOn
                        ? d.daysLate > 0
                          ? t("receivables.late", { days: d.daysLate, date: formatDay(d.dueOn, locale) })
                          : t("receivables.dueOn", { date: formatDay(d.dueOn, locale) })
                        : t("receivables.noSchedule")
                    }
                    amount={formatMoney(d.balance, locale, d.currency)}
                    amountTone={d.daysLate > 0 ? "negative" : undefined}
                    actions={
                      <>
                        {canWrite ? (
                          <>
                            <IconButton label={t("receivables.sendLink")} variant="ghost" className="h-9 w-9" onClick={() => setDialog({ kind: "link", debtor: d })} data-testid="debtor-link">
                              <Link2 className="h-4 w-4" />
                            </IconButton>
                            <IconButton label={t("receivables.assign")} variant="ghost" className="h-9 w-9" onClick={() => setDialog({ kind: "assign", debtor: d })} data-testid="debtor-assign">
                              <Building2 className="h-4 w-4" />
                            </IconButton>
                          </>
                        ) : null}
                        <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                          <Link href={routes.booking(d.bookingId)} aria-label={t("openBooking")} title={t("openBooking")}>
                            <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
                          </Link>
                        </Button>
                      </>
                    }
                  />
                ))}
              </ul>
            )}
          </Section>

          {dialog?.kind === "agency" ? <AgencyDialog repository={repository} agency={dialog.agency} open onOpenChange={close} onSaved={refresh} /> : null}
          {dialog?.kind === "status" ? <AgencyStatusDialog repository={repository} agency={dialog.agency} open onOpenChange={close} onSaved={refresh} /> : null}
          {dialog?.kind === "assign" ? <AssignAgencyDialog repository={repository} debtor={dialog.debtor} agencies={data.agencies} open onOpenChange={close} onDone={refresh} /> : null}
          {dialog?.kind === "link" ? <PaymentLinkDialog debtor={dialog.debtor} open onOpenChange={close} /> : null}
        </div>
      ) : null}
    </QueryState>
  );
}

function AgeingCard({ ageing: a, active, onPick }: { ageing: Ageing; active: AgeingBucket | null; onPick: (b: AgeingBucket) => void }) {
  const t = useTranslations("financeHub");
  const locale = useLocale();
  const total = Math.max(1, a.total);
  return (
    <div className="rounded-[24px] bg-zinc-50/80 p-4 ring-1 ring-inset ring-zinc-900/[0.04]" data-testid="ageing-card">
      <div className="flex items-baseline justify-between gap-3">
        <span className="rounded-lg bg-white px-2 py-0.5 text-[12px] font-bold text-zinc-600 shadow-sm">{a.currency}</span>
        <span className="text-[20px] font-semibold tabular-nums text-zinc-950">{formatMoneyShort(a.total, locale, a.currency)}</span>
      </div>
      <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-white" aria-hidden>
        {AGEING_BUCKETS.map((b) => (a.buckets[b] > 0 ? <div key={b} className={TONES[BUCKET_TONE[b]].dot} style={{ width: `${(a.buckets[b] / total) * 100}%` }} /> : null))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {AGEING_BUCKETS.map((b) => (
          <button
            key={b}
            type="button"
            aria-pressed={active === b}
            onClick={() => onPick(b)}
            className={cn("rounded-2xl p-2 text-start transition", active === b ? "bg-white shadow-sm ring-1 ring-zinc-900/70" : "hover:bg-white")}
          >
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
              <span className={cn("h-2 w-2 rounded-full", TONES[BUCKET_TONE[b]].dot)} />
              {t(`bucket.${b}`)}
            </span>
            <span className="mt-0.5 block text-[13px] font-semibold tabular-nums text-zinc-900">{formatMoneyShort(a.buckets[b], locale, a.currency)}</span>
            <span className="block text-[11px] text-zinc-400">{t("receivables.bookings", { count: a.counts[b] })}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AgencyCard({ agency: a, onEdit, onStatus }: { agency: Agency; onEdit?: () => void; onStatus?: () => void }) {
  const t = useTranslations("financeHub");
  const locale = useLocale();
  const look = RISK_LOOK[a.risk.level];
  return (
    <div className={cn("rounded-[26px] border border-zinc-200/60 bg-gradient-to-br p-4", TONES[look.tone].tint)} data-testid="finance-agency">
      <div className="flex items-start gap-3">
        <ProgressRing value={a.risk.usedPct} size={64} thickness={7} tone={look.tone} label={<span className="text-[13px] font-bold tabular-nums">{a.risk.usedPct}%</span>} aria-label={t("receivables.used")} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[15px] font-semibold text-zinc-900">{a.name}</span>
          </div>
          <div className="truncate text-[12px] text-zinc-500">
            {a.code} · {t("receivables.termsShort", { days: a.paymentTermsDays })}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Pill tone={look.tone} icon={look.icon}>
              {t(`risk.${a.risk.level}`)}
            </Pill>
            {a.status !== "active" ? <Pill tone="zinc">{t(`agencyStatus.${a.status}`)}</Pill> : null}
            {a.autoSuspend ? <Pill tone="sky" icon={ShieldAlert}>{t("receivables.auto")}</Pill> : null}
          </div>
        </div>
        {onEdit ? (
          <IconButton label={t("receivables.editAgency")} variant="ghost" className="h-9 w-9" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </IconButton>
        ) : null}
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-[12px]">
        <div>
          <dt className="text-zinc-400">{t("receivables.limit")}</dt>
          <dd className="font-semibold tabular-nums text-zinc-900">{formatMoneyShort(a.creditLimit, locale, a.currency)}</dd>
        </div>
        <div>
          <dt className="text-zinc-400">{t("receivables.outstanding")}</dt>
          <dd className="font-semibold tabular-nums text-zinc-900">{formatMoneyShort(a.exposure.outstanding, locale, a.currency)}</dd>
        </div>
        <div>
          <dt className="text-zinc-400">{t("receivables.overdue")}</dt>
          <dd className={cn("font-semibold tabular-nums", a.exposure.overdue > 0 ? "text-rose-600" : "text-zinc-900")}>{formatMoneyShort(a.exposure.overdue, locale, a.currency)}</dd>
        </div>
      </dl>
      {a.suspendReason ? <p className="mt-2 text-[11.5px] font-medium text-rose-700">{a.suspendReason}</p> : null}
      {onStatus ? (
        <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={onStatus} data-testid="agency-status">
          {a.status === "active" ? t("receivables.stopSales") : t("receivables.changeStatus")}
        </Button>
      ) : null}
    </div>
  );
}
