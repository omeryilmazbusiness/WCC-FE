"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import {
  LINE_TYPES,
  fromLineType,
  toLineType,
  type Booking,
  type BookingLineItem,
  type BookingRepository,
  type LineType,
} from "@/entities/booking";
import { formatMoney } from "@/shared/lib/format";
import { minorToInput, parseMoneyInput } from "@/shared/lib/money";
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useMutationFeedback, useToast } from "@/shared/ui";

type DraftLine = { type: LineType; label: string; quantity: string; unitPrice: string; unitCost: string };

const toDraft = (l: BookingLineItem): DraftLine => ({
  type: toLineType(l.kind, l.category),
  label: l.label,
  quantity: String(l.quantity),
  unitPrice: minorToInput(l.unitPrice),
  unitCost: minorToInput(l.unitCost),
});

type Props = {
  booking: Booking;
  lines: BookingLineItem[];
  repository: BookingRepository;
  editable: boolean;
  onSaved: (booking: Booking) => void;
};

export function LineItemsEditor({ booking, lines, repository, editable, onSaved }: Props) {
  const t = useTranslations("bookings");
  const tf = useTranslations("bookingWorkspace.finance");
  const te = useTranslations("bookingWorkspace.errors");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const toast = useToast();
  const emptyLine = (): DraftLine => ({ type: "package", label: t("lineDefaultLabel"), quantity: "1", unitPrice: "0", unitCost: "0" });
  const [draft, setDraft] = useState<DraftLine[]>(() => (lines.length ? lines.map(toDraft) : [emptyLine()]));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(lines.length ? lines.map(toDraft) : [emptyLine()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the server lines change
  }, [lines]);

  const update = (i: number, patch: Partial<DraftLine>) => setDraft((d) => d.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  async function save() {
    const items = draft.map((l) => ({
      ...fromLineType(l.type),
      label: l.label.trim() || t(`lineTypes.${l.type}`),
      quantity: Math.max(1, Math.trunc(Number(l.quantity)) || 1),
      unitPrice: parseMoneyInput(l.unitPrice),
      unitCost: parseMoneyInput(l.unitCost),
    }));
    if (items.some((it) => it.unitPrice === null || it.unitCost === null)) {
      toast.push({ title: tf("invalidAmount"), tone: "error" });
      return;
    }
    setSaving(true);
    try {
      const res = await repository.setLineItems(
        booking.id,
        items.map((it) => ({ ...it, unitPrice: it.unitPrice ?? 0, unitCost: it.unitCost ?? 0 })),
      );
      feedback.success(tf("linesSaved"));
      onSaved(res.booking);
    } catch (err) {
      feedback.error(err, te("save"));
    } finally {
      setSaving(false);
    }
  }

  if (!editable) {
    return (
      <div className="space-y-2">
        {lines.length === 0 ? <p className="text-[13px] text-zinc-500">{t("linesEmpty")}</p> : null}
        {lines.map((l) => (
          <div key={l.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-2xl bg-zinc-50/80 px-3 py-2.5 text-[13px]">
            <span className="min-w-0 truncate font-semibold text-zinc-900">
              {l.label} <span className="font-normal text-zinc-500">×{l.quantity}</span>
            </span>
            <span className="text-end tabular-nums">
              <span className="font-semibold">{formatMoney(l.lineTotal, locale, booking.currency)}</span>
              <span className="block text-[11.5px] text-zinc-400">{formatMoney(l.lineCost, locale, booking.currency)}</span>
            </span>
          </div>
        ))}
        <p className="text-[12px] text-zinc-400">{tf("linesLocked")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {draft.map((line, i) => (
        <div key={i} className="grid gap-2 rounded-[20px] border border-zinc-200/70 bg-white p-3 sm:grid-cols-[150px_1fr_70px_110px_110px_auto]">
          <Select
            value={line.type}
            onValueChange={(v) => {
              const type = LINE_TYPES.find((x) => x === v);
              if (type) update(i, { type });
            }}
          >
            <SelectTrigger aria-label={t("fields.kind")} data-testid="line-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LINE_TYPES.map((k) => (
                <SelectItem key={k} value={k}>
                  {t(`lineTypes.${k}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input value={line.label} aria-label={t("fields.label")} placeholder={t("fields.label")} onChange={(e) => update(i, { label: e.target.value })} />
          <Input value={line.quantity} aria-label={t("fields.qty")} inputMode="numeric" onChange={(e) => update(i, { quantity: e.target.value })} />
          <Input value={line.unitPrice} aria-label={t("fields.unitPrice")} inputMode="decimal" placeholder={t("fields.unitPrice")} onChange={(e) => update(i, { unitPrice: e.target.value })} />
          <Input value={line.unitCost} aria-label={t("fields.unitCost")} inputMode="decimal" placeholder={t("fields.unitCost")} onChange={(e) => update(i, { unitCost: e.target.value })} />
          <button
            type="button"
            aria-label={t("remove")}
            onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}
            disabled={draft.length === 1}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-rose-500 transition hover:bg-rose-50 disabled:opacity-30"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setDraft((d) => [...d, emptyLine()])}>
          <Plus className="h-4 w-4" aria-hidden />
          {tf("addLine")}
        </Button>
        <Button type="button" disabled={saving} onClick={() => void save()} data-testid="lines-save">
          {tf("saveLines")}
        </Button>
      </div>
    </div>
  );
}
