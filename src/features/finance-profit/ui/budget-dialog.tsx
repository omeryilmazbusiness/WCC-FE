"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Target } from "lucide-react";
import type { DepartureProfit, FinanceRepository } from "@/entities/finance";
import { formatMoney } from "@/shared/lib/format";
import { minorToInput, parseMoneyInput } from "@/shared/lib/money";
import { ActionDialog, Button, Field, MoneyInput, Textarea, useMutationFeedback } from "@/shared/ui";

type Props = {
  repository: FinanceRepository;
  departure: DepartureProfit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

/** Sets the planned revenue and cost of a Hajj / Umrah / group departure for budget-vs-actual. */
export function BudgetDialog({ repository, departure, open, onOpenChange, onSaved }: Props) {
  const t = useTranslations("financeHub");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const currency = departure.budget?.currency ?? departure.currency;
  const [revenue, setRevenue] = useState("");
  const [cost, setCost] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRevenue(departure.budget ? minorToInput(departure.budget.revenue) : "");
    setCost(departure.budget ? minorToInput(departure.budget.cost) : "");
    setNote(departure.budget?.note ?? "");
  }, [open, departure]);

  const r = parseMoneyInput(revenue);
  const c = cost.trim() ? parseMoneyInput(cost) : 0;
  const valid = r !== null && c !== null;

  async function submit() {
    if (!valid || r === null || c === null || saving) return;
    setSaving(true);
    try {
      await repository.setBudget(departure.departureId, { currency, revenue: r, cost: c, note: note.trim() });
      feedback.success(t("profit.budgetSaved"));
      onSaved();
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
      icon={Target}
      tone="violet"
      title={t("profit.budgetTitle", { name: departure.packageName })}
      description={t("profit.budgetHint")}
      testId="finance-budget-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={!valid || saving} onClick={() => void submit()} data-testid="finance-budget-submit">
            {saving ? t("saving") : tc("save")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("profit.plannedRevenue")} htmlFor="bg-rev">
          <MoneyInput id="bg-rev" currency={currency} value={revenue} onChange={setRevenue} autoFocus data-testid="bg-revenue" />
        </Field>
        <Field label={t("profit.plannedCost")} htmlFor="bg-cost">
          <MoneyInput id="bg-cost" currency={currency} value={cost} onChange={setCost} data-testid="bg-cost" />
        </Field>
      </div>
      {r !== null && c !== null ? (
        <div className="rounded-[20px] bg-violet-50 p-3 text-[13px] font-semibold text-violet-800">
          {t("profit.plannedMargin", { amount: formatMoney(r - c, locale, currency) })}
        </div>
      ) : null}
      <Field label={t("treasury.note")} htmlFor="bg-note">
        <Textarea id="bg-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
      </Field>
    </ActionDialog>
  );
}
