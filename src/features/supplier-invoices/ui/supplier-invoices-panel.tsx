"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  createSupplierRepository,
  INVOICE_STATUSES,
  type SupplierInvoice,
  type SupplierInvoiceStatus,
  type SupplierRepository,
} from "@/entities/supplier";
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from "@/shared/ui";

type Props = {
  supplierId: string;
  repository?: SupplierRepository;
};

function money(minor: number) {
  return (minor / 100).toFixed(2);
}

export function SupplierInvoicesPanel({ supplierId, repository }: Props) {
  const t = useTranslations("supplierInvoices");
  const { push } = useToast();
  const repo = useMemo(
    () => repository ?? createSupplierRepository(),
    [repository],
  );

  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [busy, setBusy] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [lineDesc, setLineDesc] = useState("");
  const [lineQty, setLineQty] = useState("1");
  const [lineCost, setLineCost] = useState("0");
  const [taxMajor, setTaxMajor] = useState("0");

  const refresh = useCallback(async () => {
    if (!supplierId) {
      setInvoices([]);
      return;
    }
    setInvoices(await repo.listInvoices(supplierId));
  }, [repo, supplierId]);

  useEffect(() => {
    void refresh().catch(() => push({ title: t("loadError"), tone: "error" }));
  }, [refresh, push, t]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await refresh();
      push({ title: t("saved"), tone: "success" });
    } catch (e) {
      push({
        title: t("actionError"),
        description: e instanceof Error ? e.message : undefined,
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  function statusTone(status: SupplierInvoiceStatus) {
    if (status === "paid" || status === "approved")
      return "bg-emerald-50 text-emerald-800";
    if (status === "cancelled") return "bg-zinc-100 text-zinc-500";
    if (status === "received") return "bg-sky-50 text-sky-800";
    return "bg-amber-50 text-amber-900";
  }

  if (!supplierId) {
    return (
      <p className="text-sm text-zinc-500" data-testid="supplier-invoices-panel">
        {t("selectSupplier")}
      </p>
    );
  }

  return (
    <div className="space-y-4" data-testid="supplier-invoices-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-950">{t("title")}</p>
          <p className="text-[12px] text-zinc-400">{t("subtitle")}</p>
        </div>
        <span className="text-[11px] text-zinc-400">
          {invoices.length} {t("count")}
        </span>
      </div>

      {invoices.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-100">
          {invoices.map((inv) => (
            <li
              key={inv.id}
              className="flex flex-wrap items-center gap-2 px-3 py-2.5 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900">{inv.invoiceNumber}</p>
                <p className="text-[11px] text-zinc-400">
                  {money(inv.total)} {inv.currency} · {inv.lines.length}{" "}
                  {t("lines")}
                  {inv.issueDate ? ` · ${inv.issueDate}` : ""}
                </p>
              </div>
              <Badge className={statusTone(inv.status)}>
                {t(`status.${inv.status}` as "status.draft")}
              </Badge>
              <Select
                value={inv.status}
                onValueChange={(v) =>
                  void run(() =>
                    repo.updateInvoiceStatus(
                      inv.id,
                      v as SupplierInvoiceStatus,
                    ),
                  )
                }
              >
                <SelectTrigger className="h-8 w-[130px]" disabled={busy}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVOICE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`status.${s}` as "status.draft")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 rounded-xl border border-dashed border-zinc-200 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          {t("create")}
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <Input
            className="h-8 min-w-[140px] flex-1"
            placeholder={t("invoiceNumber")}
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
          />
          <Input
            className="h-8 min-w-[160px] flex-1"
            placeholder={t("lineDescription")}
            value={lineDesc}
            onChange={(e) => setLineDesc(e.target.value)}
          />
          <Input
            className="h-8 w-[70px]"
            placeholder={t("quantity")}
            value={lineQty}
            onChange={(e) => setLineQty(e.target.value)}
          />
          <Input
            className="h-8 w-[90px]"
            placeholder={t("unitCost")}
            value={lineCost}
            onChange={(e) => setLineCost(e.target.value)}
          />
          <Input
            className="h-8 w-[80px]"
            placeholder={t("tax")}
            value={taxMajor}
            onChange={(e) => setTaxMajor(e.target.value)}
          />
          <Button
            size="sm"
            disabled={busy || !invoiceNumber.trim()}
            onClick={() =>
              void run(async () => {
                const qty = Number(lineQty) || 1;
                const unitCost = Math.round((Number(lineCost) || 0) * 100);
                const taxTotal = Math.round((Number(taxMajor) || 0) * 100);
                await repo.createInvoice({
                  supplierId,
                  invoiceNumber: invoiceNumber.trim(),
                  taxTotal,
                  lines: lineDesc.trim()
                    ? [
                        {
                          description: lineDesc.trim(),
                          quantity: qty,
                          unitCost,
                        },
                      ]
                    : [],
                });
                setInvoiceNumber("");
                setLineDesc("");
                setLineQty("1");
                setLineCost("0");
                setTaxMajor("0");
              })
            }
          >
            {t("add")}
          </Button>
        </div>
      </div>
    </div>
  );
}
