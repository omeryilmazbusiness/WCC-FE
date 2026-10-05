"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Calculator, ChevronRight, MailCheck, Plane, Plus, Upload } from "lucide-react";
import { LETTER_LOOK, type BspDetail } from "@/entities/finance";
import type { FinanceTabProps } from "./tab-props";
import { useCan } from "@/entities/viewer";
import { BspDetailDialog, BspImportDialog, LetterDialog, RefundCalculator, type LetterPartyOption } from "@/features/finance-reconciliation";
import { cn } from "@/shared/lib/cn";
import { formatDateTime, formatDay, formatMoney } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { Button, QueryState, useMutationFeedback } from "@/shared/ui";
import { MoneyRow, Pill } from "./primitives";
import { Section } from "./section";

export function ReconciliationTab({ repository, onChanged }: FinanceTabProps) {
  const t = useTranslations("financeHub");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const canWrite = useCan("payments.write");
  const statements = useApiQuery(() => repository.statements(), [repository], { cacheKey: ["finance", "bsp"] });
  const letters = useApiQuery(() => repository.letters(), [repository], { cacheKey: ["finance", "letters"], liveTopics: ["finance"] });
  const [importOpen, setImportOpen] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [detail, setDetail] = useState<BspDetail | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const receivables = useApiQuery(() => repository.receivables(), [repository], { cacheKey: ["finance", "receivables"], enabled: letterOpen });
  const payables = useApiQuery(() => repository.payables(), [repository], { cacheKey: ["finance", "payables"], enabled: letterOpen });
  const parties = useMemo<LetterPartyOption[]>(
    () => [
      ...(receivables.data?.agencies ?? []).map((a) => ({ type: "agency" as const, id: a.id, name: `${a.code} · ${a.name}`, email: a.email, phone: a.phone })),
      ...(payables.data?.suppliers ?? []).map((s) => ({ type: "supplier" as const, id: s.id, name: s.name, email: "", phone: "" })),
    ],
    [receivables.data, payables.data],
  );

  async function open(id: string) {
    if (opening) return;
    setOpening(id);
    try {
      setDetail(await repository.statement(id));
    } catch (e) {
      feedback.error(e);
    } finally {
      setOpening(null);
    }
  }

  return (
    <div className="space-y-5" data-testid="finance-reconciliation">
      <Section
        icon={Plane}
        tone="indigo"
        title={t("recon.bsp")}
        subtitle={t("recon.bspHint")}
        actions={
          canWrite ? (
            <Button onClick={() => setImportOpen(true)} data-testid="finance-bsp-import">
              <Upload className="h-4 w-4" aria-hidden />
              {t("recon.bspImport")}
            </Button>
          ) : null
        }
      >
        <QueryState loading={statements.loading} loadingVariant="list" error={statements.error} onRetry={() => void statements.reload()} empty={(statements.data ?? []).length === 0} emptyTitle={t("recon.noStatements")} emptyDescription={t("recon.noStatementsHint")}>
          <div className="grid gap-3 md:grid-cols-2">
            {(statements.data ?? []).map((s) => {
              const problems = s.mismatched + s.missingSystem + s.missingBsp;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => void open(s.id)}
                  disabled={opening === s.id}
                  className="flex items-center gap-3 rounded-[22px] bg-zinc-50/80 p-4 text-start ring-1 ring-inset ring-zinc-900/[0.04] transition hover:bg-white hover:shadow-[0_14px_34px_-26px_rgba(15,23,42,0.45)]"
                  data-testid="bsp-statement"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px] font-semibold text-zinc-900">{s.label}</div>
                    <div className="text-[12px] text-zinc-500">
                      {formatDay(s.periodStart, locale)} – {formatDay(s.periodEnd, locale)} · {t("recon.tickets", { count: s.lineCount })}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Pill tone="emerald">{t("recon.matchedCount", { count: s.matched })}</Pill>
                      {problems > 0 ? <Pill tone="rose">{t("recon.problems", { count: problems })}</Pill> : null}
                    </div>
                  </div>
                  <div className="text-end">
                    <div className={cn("text-[15px] font-bold tabular-nums", s.difference === 0 ? "text-emerald-700" : "text-rose-600")}>{formatMoney(s.difference, locale, s.currency)}</div>
                    <div className="text-[11.5px] text-zinc-400">{t("recon.difference")}</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-zinc-300 rtl:rotate-180" aria-hidden />
                </button>
              );
            })}
          </div>
        </QueryState>
      </Section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section icon={Calculator} tone="violet" title={t("recon.refund")} subtitle={t("recon.refundHint")}>
          <RefundCalculator repository={repository} />
        </Section>

        <Section
          icon={MailCheck}
          tone="emerald"
          title={t("recon.letters")}
          subtitle={t("recon.lettersHint")}
          actions={
            canWrite ? (
              <Button onClick={() => setLetterOpen(true)} data-testid="finance-new-letter">
                <Plus className="h-4 w-4" aria-hidden />
                {t("recon.createLetter")}
              </Button>
            ) : null
          }
        >
          <QueryState loading={letters.loading} loadingVariant="list" error={letters.error} onRetry={() => void letters.reload()} empty={(letters.data ?? []).length === 0} emptyTitle={t("recon.noLetters")}>
            <ul className="divide-y divide-zinc-100">
              {(letters.data ?? []).map((l) => (
                <MoneyRow
                  key={l.id}
                  icon={LETTER_LOOK[l.status].icon}
                  tone={LETTER_LOOK[l.status].tone}
                  testId="finance-letter"
                  title={
                    <span className="flex items-center gap-2">
                      <span className="truncate">{l.partyName}</span>
                      <Pill tone={LETTER_LOOK[l.status].tone}>{t(`letterStatus.${l.status}`)}</Pill>
                    </span>
                  }
                  subtitle={
                    l.respondedAt
                      ? `${l.respondedBy || "—"} · ${formatDateTime(l.respondedAt, locale)}${l.responseNote ? ` · ${l.responseNote}` : ""}`
                      : t("recon.expires", { date: formatDateTime(l.expiresAt, locale) })
                  }
                  amount={formatMoney(l.balance, locale, l.currency)}
                  amountHint={t("recon.balanceAt", { date: formatDay(l.periodEnd, locale) })}
                />
              ))}
            </ul>
          </QueryState>
        </Section>
      </div>

      {importOpen ? (
        <BspImportDialog
          repository={repository}
          open
          onOpenChange={setImportOpen}
          onImported={(d) => {
            setDetail(d);
            void statements.refresh();
            onChanged?.();
          }}
        />
      ) : null}
      {detail ? <BspDetailDialog detail={detail} open onOpenChange={(o) => !o && setDetail(null)} /> : null}
      {letterOpen ? <LetterDialog repository={repository} parties={parties} open onOpenChange={setLetterOpen} onCreated={() => void letters.refresh()} /> : null}
    </div>
  );
}
