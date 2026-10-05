"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, CalendarDays, Hash, Link2, Minus, Plus, User } from "lucide-react";
import { BookingPicker, createBookingRepository, type Booking } from "@/entities/booking";
import {
  MANUAL_MOVEMENT_KINDS,
  MOVEMENT_LOOK,
  posFee,
  type Account,
  type Direction,
  type FinanceRepository,
  type Movement,
  type MovementKind,
} from "@/entities/finance";
import { cn } from "@/shared/lib/cn";
import { localDay } from "@/shared/lib/day";
import { formatMoney } from "@/shared/lib/format";
import { parseMoneyInput } from "@/shared/lib/money";
import { ActionDialog, Button, ChoiceGrid, Field, IconInput, MoneyInput, SegmentedControl, SwitchRow, Textarea, useMutationFeedback } from "@/shared/ui";

type Props = {
  repository: FinanceRepository;
  account: Account;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPosted: (r: { movement: Movement; account: Account }) => void;
};

const FIXED_DIRECTION: Partial<Record<MovementKind, Direction>> = { collection: "in", expense: "out", refund: "out" };

/** Posts a manual collection, expense, refund or adjustment with a live balance preview. */
export function MovementDialog({ repository, account, open, onOpenChange, onPosted }: Props) {
  const t = useTranslations("financeHub");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const bookings = useMemo(() => createBookingRepository(), []);
  const [kind, setKind] = useState<MovementKind>("collection");
  const [sign, setSign] = useState<Direction>("in");
  const [amount, setAmount] = useState("");
  const [fee, setFee] = useState("");
  const [reference, setReference] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [note, setNote] = useState("");
  const [day, setDay] = useState(localDay());
  const [linkBooking, setLinkBooking] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind("collection");
    setSign("in");
    setAmount("");
    setFee("");
    setReference("");
    setCounterparty("");
    setNote("");
    setDay(localDay());
    setLinkBooking(false);
    setBooking(null);
  }, [open]);

  const direction = FIXED_DIRECTION[kind] ?? sign;
  const minor = parseMoneyInput(amount);
  const feeMinor = fee.trim() ? parseMoneyInput(fee) : null;
  const autoFee = kind === "collection" && account.kind === "pos" && minor ? posFee(minor, account.commissionBps) : 0;
  const effectiveFee = feeMinor ?? autoFee;
  const net = minor === null ? null : direction === "in" ? minor - effectiveFee : -(minor + effectiveFee);
  const after = net === null ? null : account.balance + net;
  const overdraw = after !== null && after < 0 && (account.kind === "cash" || account.kind === "wallet");
  const badFee = fee.trim() !== "" && (feeMinor === null || (minor !== null && feeMinor > minor));
  const needsNote = kind === "adjustment" && !note.trim();
  const valid = Boolean(minor) && !badFee && !overdraw && !needsNote && day <= localDay() && (!linkBooking || booking !== null);
  const search = useCallback((q: string) => bookings.list({ q }), [bookings]);

  async function submit() {
    if (!valid || minor === null || saving) return;
    setSaving(true);
    try {
      const res = await repository.postMovement(account.id, {
        direction,
        kind,
        amount: minor,
        fee: fee.trim() ? feeMinor : null,
        bookingId: linkBooking ? (booking?.id ?? null) : null,
        reference: reference.trim(),
        counterparty: counterparty.trim(),
        note: note.trim(),
        occurredOn: day,
      });
      feedback.success(t("treasury.posted"));
      onPosted(res);
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
      icon={MOVEMENT_LOOK[kind].icon}
      tone={MOVEMENT_LOOK[kind].tone}
      size="lg"
      title={t("treasury.postTitle", { account: account.name })}
      description={t("treasury.postHint")}
      testId="finance-movement-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={!valid || saving} onClick={() => void submit()} data-testid="finance-movement-submit">
            {saving ? t("saving") : t("treasury.post")}
          </Button>
        </>
      }
    >
      <ChoiceGrid
        name="movement-kind"
        columns={2}
        value={kind}
        onChange={setKind}
        options={MANUAL_MOVEMENT_KINDS.map((k) => ({ value: k, label: t(`movementKind.${k}`), ...MOVEMENT_LOOK[k] }))}
      />
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label={t("amount")} htmlFor="mv-amount">
          <MoneyInput id="mv-amount" currency={account.currency} value={amount} onChange={setAmount} autoFocus data-testid="mv-amount" />
        </Field>
        <Field label={t("treasury.fee")} htmlFor="mv-fee" hint={autoFee ? t("treasury.autoFee", { fee: formatMoney(autoFee, locale, account.currency) }) : undefined}>
          <MoneyInput id="mv-fee" currency={account.currency} value={fee} onChange={setFee} aria-invalid={badFee} />
        </Field>
        {kind === "adjustment" ? (
          <SegmentedControl
            size="lg"
            aria-label={t("treasury.direction")}
            value={sign}
            onChange={setSign}
            options={[
              { value: "in", label: t("treasury.in"), icon: Plus },
              { value: "out", label: t("treasury.out"), icon: Minus },
            ]}
          />
        ) : null}
      </div>

      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-[22px] p-4 ring-1 ring-inset",
          overdraw ? "bg-rose-50 ring-rose-100" : "bg-gradient-to-br from-emerald-50 via-white to-white ring-emerald-100",
        )}
        data-testid="mv-preview"
      >
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-zinc-500">{t("treasury.balance")}</p>
          <p className="text-[18px] font-bold tabular-nums text-zinc-900">{formatMoney(account.balance, locale, account.currency)}</p>
        </div>
        <ArrowRight className="h-5 w-5 text-zinc-400 rtl:rotate-180" aria-hidden />
        <div className="text-end">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-zinc-500">{t("treasury.after")}</p>
          {overdraw ? (
            <p className="text-[13px] font-semibold text-rose-700">{t("treasury.overdraw")}</p>
          ) : (
            <p className={cn("text-[18px] font-bold tabular-nums", after === null ? "text-zinc-300" : "text-emerald-700")}>
              {after === null ? "—" : formatMoney(after, locale, account.currency)}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("treasury.reference")} htmlFor="mv-ref">
          <IconInput id="mv-ref" icon={Hash} dir="ltr" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={140} />
        </Field>
        <Field label={t("treasury.counterparty")} htmlFor="mv-cp">
          <IconInput id="mv-cp" icon={User} value={counterparty} onChange={(e) => setCounterparty(e.target.value)} maxLength={140} />
        </Field>
        <Field label={t("treasury.date")} htmlFor="mv-day">
          <IconInput id="mv-day" icon={CalendarDays} type="date" max={localDay()} value={day} onChange={(e) => setDay(e.target.value)} />
        </Field>
      </div>
      <Field label={kind === "adjustment" ? t("treasury.noteRequired") : t("treasury.note")} htmlFor="mv-note">
        <Textarea id="mv-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
      </Field>
      {kind === "collection" || kind === "refund" ? (
        <>
          <SwitchRow icon={Link2} tone="indigo" label={t("treasury.linkBooking")} hint={t("treasury.linkBookingHint")} checked={linkBooking} onChange={setLinkBooking} />
          {linkBooking ? (
            <BookingPicker
              search={search}
              value={booking}
              onChange={setBooking}
              placeholder={t("bookingSearch")}
              emptyLabel={t("bookingEmpty")}
              formatAmount={(b) => formatMoney(b.balanceAmt, locale, b.currency)}
            />
          ) : null}
        </>
      ) : null}
    </ActionDialog>
  );
}
