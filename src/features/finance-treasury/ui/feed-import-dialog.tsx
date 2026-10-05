"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BadgeCheck, CopyX, FileUp, HandCoins, Upload } from "lucide-react";
import { parseBankCsv, type Account, type FeedResult, type FinanceRepository } from "@/entities/finance";
import { formatMoney } from "@/shared/lib/format";
import { ActionDialog, Button, Textarea, useMutationFeedback } from "@/shared/ui";

type Props = {
  repository: FinanceRepository;
  account: Account;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (r: FeedResult) => void;
};

const MAX_ROWS = 2000;
const MAX_BYTES = 2 * 1024 * 1024;

/** Imports a bank statement CSV; credits that mention a booking ref are matched on the server. */
export function FeedImportDialog({ repository, account, open, onOpenChange, onImported }: Props) {
  const t = useTranslations("financeHub");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const [text, setText] = useState("");
  const [result, setResult] = useState<FeedResult | null>(null);
  const [tooBig, setTooBig] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setText("");
    setResult(null);
    setTooBig(false);
  }, [open]);

  const parsed = useMemo(() => (text.trim() ? parseBankCsv(text) : null), [text]);
  const rows = parsed?.rows ?? [];
  const credits = rows.filter((r) => r.direction === "in");
  const valid = rows.length > 0 && rows.length <= MAX_ROWS && !result;

  async function pick(file: File | undefined) {
    if (!file) return;
    setResult(null);
    if (file.size > MAX_BYTES) {
      setTooBig(true);
      return;
    }
    setTooBig(false);
    setText(await file.text());
  }

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const r = await repository.importFeed(account.id, rows);
      setResult(r);
      feedback.success(t("treasury.feedDone"));
      onImported(r);
    } catch (e) {
      feedback.error(e, t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={FileUp}
      tone="indigo"
      size="lg"
      title={t("treasury.feedTitle", { account: account.name })}
      description={t("treasury.feedHint")}
      testId="finance-feed-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {result ? t("close") : tc("cancel")}
          </Button>
          {result ? null : (
            <Button disabled={!valid || saving} onClick={() => void submit()} data-testid="finance-feed-submit">
              {saving ? t("saving") : t("treasury.feedImport", { count: rows.length })}
            </Button>
          )}
        </>
      }
    >
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[22px] border-2 border-dashed border-zinc-200 bg-zinc-50/60 p-6 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40">
        <span className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-indigo-400 to-indigo-600 text-white" aria-hidden>
          <Upload className="h-7 w-7" />
        </span>
        <span className="text-[14px] font-semibold text-zinc-900">{t("treasury.feedPick")}</span>
        <span className="text-[12px] text-zinc-500">{t("treasury.feedColumns")}</span>
        <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} data-testid="feed-file" />
      </label>
      {tooBig ? <p className="text-[12.5px] font-semibold text-rose-700">{t("treasury.feedTooBig")}</p> : null}
      <Textarea rows={5} dir="ltr" className="font-mono text-[12px]" placeholder={"date;description;amount\n2026-10-01;BK-000123 Ali;1500.00"} value={text} onChange={(e) => { setText(e.target.value); setResult(null); }} aria-label={t("treasury.feedPaste")} />

      {parsed ? (
        <div className="grid grid-cols-3 gap-2.5 text-center" data-testid="feed-preview">
          <Stat label={t("treasury.feedRows")} value={rows.length} />
          <Stat label={t("treasury.feedCredits")} value={credits.length} />
          <Stat label={t("treasury.feedErrors")} value={parsed.errors.length} warn={parsed.errors.length > 0} />
        </div>
      ) : null}
      {rows.length > MAX_ROWS ? <p className="text-[12.5px] font-semibold text-rose-700">{t("treasury.feedMax", { max: MAX_ROWS })}</p> : null}
      {parsed && parsed.errors.length > 0 ? (
        <ul className="space-y-1 text-[12px] text-amber-700">
          {parsed.errors.slice(0, 5).map((e) => (
            <li key={e.line}>{t("treasury.feedError", { line: e.line, reason: t(`csvError.${e.reason}`) })}</li>
          ))}
        </ul>
      ) : null}
      {rows.length > 0 && !result ? (
        <ul className="divide-y divide-zinc-100 rounded-[18px] border border-zinc-100 px-3 text-[12.5px]">
          {rows.slice(0, 5).map((r) => (
            <li key={r.externalId} className="flex items-center justify-between gap-3 py-2">
              <span className="truncate text-zinc-600">
                {r.occurredOn} · {r.description || r.counterparty}
              </span>
              <span className={r.direction === "in" ? "font-semibold tabular-nums text-emerald-700" : "font-semibold tabular-nums text-rose-700"}>
                {r.direction === "in" ? "+" : "−"}
                {formatMoney(r.amount, locale, account.currency)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {result ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" data-testid="feed-result">
          <ResultTile icon={FileUp} label={t("treasury.feedImported")} value={result.imported} />
          <ResultTile icon={BadgeCheck} label={t("treasury.feedMatched")} value={result.autoMatched} />
          <ResultTile icon={HandCoins} label={t("treasury.feedUnmatched")} value={result.unmatched} />
          <ResultTile icon={CopyX} label={t("treasury.feedDuplicates")} value={result.duplicates} />
        </div>
      ) : null}
    </ActionDialog>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={warn ? "rounded-[18px] bg-amber-50 p-3" : "rounded-[18px] bg-zinc-50 p-3"}>
      <div className="text-[20px] font-semibold tabular-nums text-zinc-950">{value}</div>
      <div className="text-[11.5px] font-medium text-zinc-500">{label}</div>
    </div>
  );
}

function ResultTile({ icon: Icon, label, value }: { icon: typeof FileUp; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[18px] bg-gradient-to-br from-emerald-50 via-white to-white p-3 ring-1 ring-inset ring-emerald-100">
      <Icon className="h-5 w-5 text-emerald-600" aria-hidden />
      <div>
        <div className="text-[18px] font-semibold tabular-nums text-zinc-950">{value}</div>
        <div className="text-[11px] font-medium text-zinc-500">{label}</div>
      </div>
    </div>
  );
}
