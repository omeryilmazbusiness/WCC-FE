"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Plus, ReceiptText, Trash2 } from "lucide-react";
import {
  INVOICE_TRANSITIONS,
  dueDateFor,
  type InvoiceLineInput,
  type Supplier,
  type SupplierInvoice,
  type SupplierInvoiceStatus,
  type SupplierRepository,
} from "@/entities/supplier";
import { useCan } from "@/entities/viewer";
import { cn } from "@/shared/lib/cn";
import { formatDay, formatMoney } from "@/shared/lib/format";
import { parseMoneyInput } from "@/shared/lib/money";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { ActionDialog, Button, EmptyState, Field, IconInput, Input, InfoSection, MoneyInput, QueryState, useMutationFeedback } from "@/shared/ui";

const STATUS_CLASS: Record<SupplierInvoiceStatus, string> = {
  draft: "bg-zinc-100 text-zinc-600",
  submitted: "bg-sky-50 text-sky-700",
  approved: "bg-indigo-50 text-indigo-700",
  paid: "bg-emerald-50 text-emerald-700",
  void: "bg-rose-50 text-rose-600 line-through",
};

type Props = { supplier: Supplier; repository: SupplierRepository };

/** Supplier bills: draft → submitted → approved → paid, or void. */
export function SupplierInvoicesPanel({ supplier, repository }: Props) {
  const t = useTranslations("suppliers.invoices");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const canWrite = useCan("suppliers.write");
  const [busy, setBusy] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const query = useApiQuery(() => repository.listInvoices(supplier.id), [repository, supplier.id], { cacheKey: ["supplier-invoices", supplier.id] });
  const invoices = query.data ?? [];

  async function move(inv: SupplierInvoice, status: SupplierInvoiceStatus) {
    setBusy(inv.id);
    try {
      const next = await repository.updateInvoiceStatus(inv.id, status);
      query.setData((list) => (list ?? []).map((i) => (i.id === next.id ? next : i)));
      feedback.success(t("moved", { status: t(`status.${status}`) }));
    } catch (e) {
      feedback.error(e, t("actionError"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <InfoSection
      icon={ReceiptText}
      tone="violet"
      title={t("title")}
      badge={invoices.length ? <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700">{invoices.length}</span> : null}
      action={
        canWrite ? (
          <Button size="sm" onClick={() => setCreating(true)} data-testid="supplier-invoice-new">
            <Plus className="h-4 w-4" aria-hidden />
            {t("new")}
          </Button>
        ) : null
      }
      data-testid="supplier-invoices-panel"
    >
      <QueryState loading={query.loading && !query.data} error={query.error} onRetry={() => void query.reload()}>
        {invoices.length === 0 ? (
          <EmptyState icon={ReceiptText} title={t("empty")} description={t("emptyHint")} />
        ) : (
          <ul className="divide-y divide-zinc-100">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0" data-testid={`supplier-invoice-${inv.invoiceNumber}`}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600" aria-hidden>
                  <ReceiptText className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[14px] font-semibold text-zinc-900">
                    <bdi className="font-mono">{inv.invoiceNumber}</bdi>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-bold", STATUS_CLASS[inv.status])}>{t(`status.${inv.status}`)}</span>
                  </p>
                  <p className="text-[12px] text-zinc-500">
                    {t("lines", { n: inv.lines.length })}
                    {inv.issueDate ? ` · ${formatDay(inv.issueDate, locale)}` : ""}
                    {inv.dueDate ? ` · ${t("due", { date: formatDay(inv.dueDate, locale) })}` : ""}
                  </p>
                </div>
                <p className="text-[15px] font-bold tabular-nums text-zinc-900">{formatMoney(inv.total, locale, inv.currency)}</p>
                {canWrite && INVOICE_TRANSITIONS[inv.status].length ? (
                  <div className="flex w-full flex-wrap justify-end gap-1.5 sm:w-auto">
                    {INVOICE_TRANSITIONS[inv.status].map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={s === "void" || s === "draft" ? "outline" : "default"}
                        disabled={busy === inv.id}
                        onClick={() => void move(inv, s)}
                        data-testid={`supplier-invoice-${inv.invoiceNumber}-${s}`}
                      >
                        {t(`action.${s}`)}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </QueryState>
      <CreateInvoiceDialog
        open={creating}
        onOpenChange={setCreating}
        supplier={supplier}
        repository={repository}
        onCreated={(inv) => query.setData((list) => [inv, ...(list ?? [])])}
      />
    </InfoSection>
  );
}

type LineDraft = { description: string; quantity: string; unitCost: string };
const emptyLine = (): LineDraft => ({ description: "", quantity: "1", unitCost: "" });

function CreateInvoiceDialog({
  open,
  onOpenChange,
  supplier,
  repository,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  supplier: Supplier;
  repository: SupplierRepository;
  onCreated: (inv: SupplierInvoice) => void;
}) {
  const t = useTranslations("suppliers.invoices");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const currency = supplier.finance.currency;
  const [number, setNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTouched, setDueTouched] = useState(false);
  const [tax, setTax] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const terms = supplier.finance.paymentTerms;

  useEffect(() => {
    if (!open) return;
    const today = new Date().toLocaleDateString("en-CA");
    setNumber("");
    setIssueDate(today);
    setDueDate(dueDateFor(today, terms));
    setDueTouched(false);
    setTax("");
    setLines([emptyLine()]);
  }, [open, terms]);

  const parsed: (InvoiceLineInput | null)[] = lines
    .filter((l) => l.description.trim() || l.unitCost.trim())
    .map((l) => {
      const qty = Number(l.quantity);
      const cost = parseMoneyInput(l.unitCost);
      if (!l.description.trim() || !Number.isInteger(qty) || qty < 1 || cost === null) return null;
      return { description: l.description.trim(), quantity: qty, unitCost: cost };
    });
  const taxMinor = tax.trim() ? parseMoneyInput(tax) : 0;
  const linesOk = parsed.every(Boolean);
  const subtotal = parsed.reduce((s, l) => s + (l ? l.quantity * l.unitCost : 0), 0);
  const datesOk = !issueDate || !dueDate || dueDate >= issueDate;
  const valid = number.trim().length > 0 && linesOk && taxMinor !== null && datesOk && !saving;

  async function submit() {
    if (!valid) return;
    setSaving(true);
    try {
      const inv = await repository.createInvoice({
        supplierId: supplier.id,
        invoiceNumber: number.trim(),
        currency,
        issueDate: issueDate || undefined,
        dueDate: dueDate || undefined,
        taxTotal: taxMinor ?? 0,
        lines: parsed.filter((l): l is InvoiceLineInput => Boolean(l)),
      });
      feedback.success(t("created"));
      onCreated(inv);
      onOpenChange(false);
    } catch (e) {
      feedback.error(e, t("actionError"));
    } finally {
      setSaving(false);
    }
  }

  const patch = (i: number, p: Partial<LineDraft>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)));

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={ReceiptText}
      tone="violet"
      size="lg"
      title={t("createTitle")}
      description={t("createSubtitle")}
      testId="supplier-invoice-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={!valid} onClick={() => void submit()} data-testid="supplier-invoice-submit">
            {saving ? t("saving") : t("create")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("number")} htmlFor="inv-number">
            <Input id="inv-number" dir="ltr" className="h-12 font-mono" value={number} onChange={(e) => setNumber(e.target.value)} maxLength={80} autoFocus data-testid="supplier-invoice-number" />
          </Field>
          <Field label={t("issued")} htmlFor="inv-issued">
            <IconInput id="inv-issued" icon={CalendarDays} type="date" value={issueDate}
              onChange={(e) => {
                setIssueDate(e.target.value);
                if (!dueTouched) setDueDate(dueDateFor(e.target.value, terms));
              }}
            />
          </Field>
          <Field label={t("dueOn")} htmlFor="inv-due">
            <IconInput id="inv-due" icon={CalendarDays} type="date" value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                setDueTouched(true);
              }}
            />
            {!datesOk ? <p className="text-[12px] font-medium text-rose-600">{t("dateOrder")}</p> : null}
          </Field>
        </div>
        <div className="space-y-2 rounded-[22px] border border-zinc-200/70 bg-zinc-50/60 p-3">
          <p className="text-[12.5px] font-semibold text-zinc-600">{t("linesTitle")}</p>
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_72px_120px_40px] gap-2">
              <Input value={l.description} onChange={(e) => patch(i, { description: e.target.value })} placeholder={t("description")} maxLength={300} aria-label={t("description")} />
              <Input inputMode="numeric" value={l.quantity} onChange={(e) => patch(i, { quantity: e.target.value.replace(/\D/g, "").slice(0, 5) })} aria-label={t("quantity")} className="text-center tabular-nums" />
              <Input inputMode="decimal" value={l.unitCost} onChange={(e) => patch(i, { unitCost: e.target.value.replace(/[^\d.,]/g, "") })} placeholder={t("unitCost")} aria-label={t("unitCost")} className="tabular-nums" />
              <button
                type="button"
                onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : [emptyLine()]))}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                aria-label={t("removeLine")}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
          {!linesOk ? <p className="text-[12px] font-medium text-rose-600">{t("lineError")}</p> : null}
          <Button size="sm" variant="outline" onClick={() => setLines((ls) => [...ls, emptyLine()])}>
            <Plus className="h-4 w-4" aria-hidden />
            {t("addLine")}
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
          <Field label={t("tax")} htmlFor="inv-tax">
            <MoneyInput id="inv-tax" currency={currency} value={tax} onChange={setTax} />
          </Field>
          <div className="rounded-[20px] bg-gradient-to-br from-violet-50 via-white to-white p-3 text-end ring-1 ring-inset ring-violet-100">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-zinc-500">{t("total")}</p>
            <p className="text-[20px] font-bold tabular-nums text-zinc-900">{formatMoney(subtotal + (taxMinor ?? 0), locale, currency)}</p>
          </div>
        </div>
      </div>
    </ActionDialog>
  );
}
