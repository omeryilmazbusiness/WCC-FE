"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, ChevronLeft, ChevronRight, PencilLine, Wallet } from "lucide-react";
import {
  CALENDAR_MONTHS,
  ROOM_LOOK,
  monthlyCell,
  monthlyPricedCount,
  replaceRoomInYear,
  type HotelDetail,
  type HotelRepository,
  type RoomType,
} from "@/entities/hotel";
import { cn } from "@/shared/lib/cn";
import { formatMoney } from "@/shared/lib/format";
import { Button, FormSection, Tabs, TabsContent, TabsList, TabsTrigger, useMutationFeedback } from "@/shared/ui";
import { roomYearFromRates, roomYearToRates, type RoomYearDraft } from "../model/room-month-draft";
import { RoomTypeRatesDialog } from "./room-type-rates-dialog";

type Props = {
  detail: HotelDetail;
  repository: HotelRepository;
  canWrite: boolean;
  onChanged: () => void;
};

/** Year sheet by room type: GM sees firma + satış and edits in the popup; staff see satış only. */
export function MonthlyRatesBoard({ detail, repository, canWrite, onChanged }: Props) {
  const t = useTranslations("hotels");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const rooms = detail.hotel.roomTypes;
  const yearNow = Number(detail.today.slice(0, 4)) || new Date().getUTCFullYear();
  const monthNow = Number(detail.today.slice(5, 7));
  const [year, setYear] = useState(yearNow);
  const [room, setRoom] = useState<RoomType>(rooms[0] ?? "standard");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (rooms.length && !rooms.includes(room)) setRoom(rooms[0]);
  }, [room, rooms]);

  const money = (v: number) => formatMoney(v, locale, detail.hotel.currency);

  function openEditor() {
    if (!canWrite) return;
    setEditing(true);
  }

  async function saveRoom(nextRoom: RoomType, draft: RoomYearDraft) {
    const rows = roomYearToRates(nextRoom, draft);
    if (!rows) {
      feedback.error(new Error("invalid monthly rates"), t("rates.monthlySaveError"));
      return;
    }
    setSaving(true);
    try {
      await repository.replaceMonthlyRates(detail.hotel.id, draft.year, replaceRoomInYear(detail.monthlyRates, draft.year, nextRoom, rows));
      setYear(draft.year);
      setRoom(nextRoom);
      setEditing(false);
      feedback.success(t("rates.monthlySaved"));
      onChanged();
    } catch (e) {
      feedback.error(e, t("rates.monthlySaveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormSection
      icon={CalendarDays}
      tone="sky"
      title={t("rates.monthlyTitle")}
      hint={canWrite ? t("rates.monthlyHintWrite") : t("rates.monthlyHintRead")}
      testId="monthly-rates-board"
      aside={
        <div className="inline-flex items-center gap-0.5 rounded-2xl bg-zinc-100 p-1">
          <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-600 hover:bg-white" onClick={() => setYear((y) => y - 1)} aria-label={t("rates.prevYear")}>
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
          <span className="min-w-14 text-center text-[14px] font-semibold tabular-nums text-zinc-950">{year}</span>
          <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-600 hover:bg-white" onClick={() => setYear((y) => y + 1)} aria-label={t("rates.nextYear")}>
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </button>
        </div>
      }
    >
      {rooms.length === 0 ? (
        <p className="rounded-2xl bg-zinc-50 px-4 py-3 text-[13px] font-medium text-zinc-500">{t("rates.noRooms")}</p>
      ) : (
        <Tabs value={room} onValueChange={(v) => setRoom(v as RoomType)}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="h-auto min-w-0 flex-wrap" aria-label={t("rates.pickRoom")} data-testid="monthly-room-tabs">
              {rooms.map((r) => {
                const look = ROOM_LOOK[r];
                const Icon = look.icon;
                const n = monthlyPricedCount(detail.monthlyRates, year, r);
                return (
                  <TabsTrigger key={r} value={r} className="gap-2" data-testid={`monthly-room-${r}`}>
                    <Icon className="h-4 w-4" aria-hidden />
                    {t(`room.${r}`)}
                    <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums">{t("rates.pricedCount", { n })}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {canWrite ? (
              <Button onClick={openEditor} disabled={saving} data-testid="monthly-room-edit">
                <PencilLine className="h-4 w-4" aria-hidden />
                {t("rates.editYearPrices", { room: t(`room.${room}`) })}
              </Button>
            ) : null}
          </div>

          {rooms.map((r) => (
            <TabsContent key={r} value={r} className="mt-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" data-testid={`monthly-rates-${r}`}>
                {CALENDAR_MONTHS.map((month) => {
                  const cell = monthlyCell(detail.monthlyRates, year, month, r);
                  const priced = cell.sell > 0 || (canWrite && cell.net > 0);
                  const current = year === yearNow && month === monthNow;
                  return (
                    <article
                      key={month}
                      className={cn(
                        "rounded-[22px] p-3.5 ring-1 ring-inset transition",
                        current ? "bg-sky-50/80 ring-sky-200/80" : "bg-zinc-50/70 ring-zinc-900/[0.04]",
                        canWrite && "cursor-pointer hover:bg-white hover:ring-zinc-900/10",
                      )}
                      data-testid={`monthly-cell-${r}-${month}`}
                    >
                      {canWrite ? (
                        <button type="button" className="block w-full text-start" onClick={openEditor} aria-label={`${t(`room.${r}`)} ${t(`month.${month}`)}`}>
                          <MonthCard month={month} sell={cell.sell} net={canWrite ? cell.net : 0} showNet={canWrite} priced={priced} current={current} money={money} />
                        </button>
                      ) : (
                        <MonthCard month={month} sell={cell.sell} net={0} showNet={false} priced={priced} current={current} money={money} />
                      )}
                    </article>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {canWrite ? (
        <RoomTypeRatesDialog
          key={`${room}-${year}-${editing ? "open" : "closed"}`}
          open={editing}
          room={room}
          currency={detail.hotel.currency}
          fallback={detail.hotel.markup}
          value={roomYearFromRates(room, year, detail.monthlyRates, detail.hotel.markup)}
          onOpenChange={(next) => {
            if (!next) setEditing(false);
          }}
          onDone={(nextRoom, draft) => void saveRoom(nextRoom, draft)}
        />
      ) : null}
    </FormSection>
  );
}

function MonthCard({
  month,
  sell,
  net,
  showNet,
  priced,
  current,
  money,
}: {
  month: number;
  sell: number;
  net: number;
  showNet: boolean;
  priced: boolean;
  current: boolean;
  money: (v: number) => string;
}) {
  const t = useTranslations("hotels");
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-[13.5px] font-semibold text-zinc-900">{t(`month.${month}`)}</h4>
        {current ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10.5px] font-bold text-sky-800">{t("rates.current")}</span> : null}
      </div>
      {priced ? (
        <div className="space-y-2">
          <p>
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{t("rates.selling")}</span>
            <span className="text-[20px] font-semibold tabular-nums tracking-tight text-zinc-950">{money(sell)}</span>
          </p>
          {showNet ? (
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-600">
              <Wallet className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
              <span>{t("rates.company")}</span>
              <span className="tabular-nums text-zinc-900">{net > 0 ? money(net) : t("rates.unpriced")}</span>
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-[13.5px] font-medium text-zinc-400">{t("rates.unpriced")}</p>
      )}
    </div>
  );
}
