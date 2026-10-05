"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Coins, Plane, Tag, Upload } from "lucide-react";
import { parseBspCsv, type BspDetail, type FinanceRepository } from "@/entities/finance";
import { localDay } from "@/shared/lib/day";
import { formatMoney } from "@/shared/lib/format";
import { ActionDialog, Button, Field, IconInput, Textarea, useMutationFeedback } from "@/shared/ui";

type Props = {
  repository: FinanceRepository;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (d: BspDetail) => void;
};

const MAX_ROWS = 5000;
const MAX_BYTES = 4 * 1024 * 1024;

function monthStart(day: string): string {
  return `${day.slice(0, 8)}01`;
}

/** Uploads an IATA BSP billing file and compares every ticket with the system. */
export function BspImportDialog({ repository, open, onOpenChange, onImported }: Props) {
  const t = useTranslations("financeHub");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const [label, setLabel] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [text, setText] = useState("");
  const [tooBig, setTooBig] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const today = localDay();
    setLabel("");
    setFrom(monthStart(today));
    setTo(today);
    setCurrency("SAR");
    setText("");
    setTooBig(false);
  }, [open]);

  const parsed = useMemo(() => (text.trim() ? parseBspCsv(text) : null), [text]);
  const rows = parsed?.rows ?? [];
  const total = rows.reduce((s, r) => s + (r.type === "refund" || r.type === "acm" ? -r.amount : r.amount), 0);
  const valid = label.trim().length > 0 && from !== "" && to !== "" && from <= to && /^[A-Z]{3}$/.test(currency) && rows.length > 0 && rows.length <= MAX_ROWS;

  async function pick(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setTooBig(true);
      return;
    }
    setTooBig(false);
    setText(await file.text());
    if (!label.trim()) setLabel(file.name.replace(/\.[^.]+$/, "").slice(0, 80));
  }

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const d = await repository.importStatement({ label: label.trim(), periodStart: from, periodEnd: to, currency, lines: rows });
      feedback.success(t("recon.imported"));
      onImported(d);
      onOpenChange(false);
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
      icon={Plane}
      tone="indigo"
      size="lg"
      title={t("recon.bspImport")}
      description={t("recon.bspImportHint")}
      testId="finance-bsp-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={!valid || saving} onClick={() => void submit()} data-testid="finance-bsp-submit">
            {saving ? t("saving") : t("recon.compare", { count: rows.length })}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <Field label={t("recon.label")} htmlFor="bsp-label">
          <IconInput id="bsp-label" icon={Tag} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} data-testid="bsp-label" />
        </Field>
        <Field label={t("currency")} htmlFor="bsp-cur">
          <IconInput id="bsp-cur" icon={Coins} dir="ltr" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3))} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("profit.from")} htmlFor="bsp-from">
          <IconInput id="bsp-from" icon={CalendarDays} type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label={t("profit.to")} htmlFor="bsp-to">
          <IconInput id="bsp-to" icon={CalendarDays} type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </div>
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[22px] border-2 border-dashed border-zinc-200 bg-zinc-50/60 p-5 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40">
        <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-indigo-400 to-indigo-600 text-white" aria-hidden>
          <Upload className="h-6 w-6" />
        </span>
        <span className="text-[13.5px] font-semibold text-zinc-900">{t("recon.bspPick")}</span>
        <span className="text-[12px] text-zinc-500">{t("recon.bspColumns")}</span>
        <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} data-testid="bsp-file" />
      </label>
      {tooBig ? <p className="text-[12.5px] font-semibold text-rose-700">{t("treasury.feedTooBig")}</p> : null}
      <Textarea rows={4} dir="ltr" className="font-mono text-[12px]" placeholder={"document;pnr;type;passenger;date;amount\n0652400000001;ABC123;TKTT;ALI/AHMED;2026-10-01;1500.00"} value={text} onChange={(e) => setText(e.target.value)} aria-label={t("treasury.feedPaste")} />
      {parsed ? (
        <div className="flex flex-wrap items-center gap-3 text-[12.5px]" data-testid="bsp-preview">
          <span className="rounded-full bg-zinc-100 px-3 py-1 font-semibold text-zinc-700">{t("recon.tickets", { count: rows.length })}</span>
          <span className="rounded-full bg-indigo-50 px-3 py-1 font-semibold tabular-nums text-indigo-700">{formatMoney(total, locale, currency || "SAR")}</span>
          {parsed.errors.length > 0 ? <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">{t("recon.skipped", { count: parsed.errors.length })}</span> : null}
        </div>
      ) : null}
      {rows.length > MAX_ROWS ? <p className="text-[12.5px] font-semibold text-rose-700">{t("treasury.feedMax", { max: MAX_ROWS })}</p> : null}
    </ActionDialog>
  );
}
