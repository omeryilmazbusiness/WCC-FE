"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BadgePercent, ChevronLeft, ChevronRight, Coins, Wallet } from "lucide-react";
import { CALENDAR_MONTHS, ROOM_LOOK, type Markup, type MarkupKind, type RoomType } from "@/entities/hotel";
import { cn } from "@/shared/lib/cn";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Field,
  GlyphTile,
  Input,
  SegmentedControl,
  TONES,
} from "@/shared/ui";
import {
  applyMonthMargin,
  applyMonthNet,
  applyMonthSell,
  emptyRoomYear,
  pricedMonthCount,
  type RoomYearDraft,
} from "../model/room-month-draft";

type Props = {
  open: boolean;
  room: RoomType | null;
  currency: string;
  fallback: Markup;
  value: RoomYearDraft | null;
  onOpenChange: (open: boolean) => void;
  onDone: (room: RoomType, draft: RoomYearDraft) => void;
};

/** Nested desk for one room type: company price + margin → selling price, month by month. */
export function RoomTypeRatesDialog({ open, room, currency, fallback, value, onOpenChange, onDone }: Props) {
  const t = useTranslations("hotels");
  const tc = useTranslations("common");
  const [draft, setDraft] = useState<RoomYearDraft>(() => value ?? emptyRoomYear(new Date().getFullYear(), fallback));
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;
  const session = useRef(false);

  useEffect(() => {
    if (!open) {
      session.current = false;
      return;
    }
    if (session.current) return;
    session.current = true;
    setDraft(value ?? emptyRoomYear(new Date().getFullYear(), fallbackRef.current));
  }, [open, value]);

  if (!room) return null;
  const look = ROOM_LOOK[room];
  const Icon = look.icon;

  function setMonth(month: number, next: RoomYearDraft["months"][number]) {
    setDraft((d) => ({ ...d, months: { ...d.months, [month]: next } }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[80]"
        className="z-[80] flex h-[min(92vh,900px)] w-[min(96vw,1080px)] max-w-none flex-col gap-0 overflow-hidden bg-[#f4f6fa] p-0 sm:p-0"
        data-testid="room-type-rates-dialog"
      >
        <DialogHeader className="shrink-0 space-y-0 border-b border-zinc-200/60 bg-white/80 px-5 py-4 backdrop-blur-xl sm:px-8 sm:py-5">
          <div className="flex items-center gap-3.5 pe-10">
            <GlyphTile icon={Icon} tone={look.tone} size="xl" />
            <div className="min-w-0">
              <DialogTitle className="text-[20px] leading-tight tracking-tight sm:text-[22px]">
                {t("rates.roomPopupTitle", { room: t(`room.${room}`) })}
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] leading-snug sm:text-[13.5px]">{t("rates.roomPopupHint")}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 rounded-2xl bg-white p-1 ring-1 ring-inset ring-zinc-200">
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-600 hover:bg-zinc-50" onClick={() => setDraft((d) => ({ ...d, year: d.year - 1 }))} aria-label={t("rates.prevYear")}>
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              </button>
              <span className="min-w-16 text-center text-[14px] font-semibold tabular-nums text-zinc-950">{draft.year}</span>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-600 hover:bg-zinc-50" onClick={() => setDraft((d) => ({ ...d, year: d.year + 1 }))} aria-label={t("rates.nextYear")}>
                <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              </button>
            </div>
            <p className="text-[12.5px] font-medium text-zinc-500">{t("rates.pricedMonths", { n: pricedMonthCount(draft) })}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {CALENDAR_MONTHS.map((month) => {
              const cell = draft.months[month];
              return (
                <article key={month} className="rounded-[22px] bg-white p-3.5 ring-1 ring-inset ring-zinc-900/[0.05]" data-testid={`room-month-${month}`}>
                  <h4 className="mb-3 text-[13.5px] font-semibold text-zinc-900">{t(`month.${month}`)}</h4>
                  <div className="space-y-2.5">
                    <Field label={t("rates.company")}>
                      <div className="relative">
                        <Input
                          inputMode="decimal"
                          value={cell.net}
                          onChange={(e) => setMonth(month, applyMonthNet(cell, e.target.value))}
                          className="h-11 pe-12 text-[15px] font-semibold tabular-nums"
                          aria-label={`${t(`month.${month}`)} ${t("rates.company")}`}
                        />
                        <Wallet className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
                      </div>
                    </Field>
                    <div>
                      <p className="mb-1.5 text-[12px] font-semibold text-zinc-600">{t("rates.profit")}</p>
                      <div className="flex gap-2">
                        <SegmentedControl
                          aria-label={t("rates.profit")}
                          value={cell.marginKind}
                          onChange={(v) => setMonth(month, applyMonthMargin(cell, v as MarkupKind, cell.marginValue))}
                          options={[
                            { value: "percent", label: "%", icon: BadgePercent },
                            { value: "fixed", label: currency, icon: Coins },
                          ]}
                        />
                        <div className="relative min-w-0 flex-1">
                          <Input
                            inputMode="decimal"
                            value={cell.marginValue}
                            onChange={(e) => setMonth(month, applyMonthMargin(cell, cell.marginKind, e.target.value))}
                            className="h-11 pe-10 text-[15px] font-semibold tabular-nums"
                            aria-label={`${t(`month.${month}`)} ${t("rates.profit")}`}
                          />
                          <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-zinc-400">
                            {cell.marginKind === "percent" ? "%" : currency}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Field label={t("rates.selling")}>
                      <div className="relative">
                        <Input
                          inputMode="decimal"
                          value={cell.sell}
                          onChange={(e) => setMonth(month, applyMonthSell(cell, e.target.value))}
                          className={cn("h-11 pe-12 text-[15px] font-semibold tabular-nums", TONES.amber.soft)}
                          aria-label={`${t(`month.${month}`)} ${t("rates.selling")}`}
                        />
                        <Coins className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500" aria-hidden />
                      </div>
                    </Field>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-zinc-200/60 bg-white/80 px-5 py-4 backdrop-blur-xl sm:px-8">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={() => onDone(room, draft)} data-testid="room-type-rates-done">
            {t("rates.saveRoomPrices")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
