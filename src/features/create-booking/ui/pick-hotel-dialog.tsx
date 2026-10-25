"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Building2, Search } from "lucide-react";
import { createHotelRepository } from "@/entities/hotel/api";
import type { HotelDetail, HotelListItem, RoomType } from "@/entities/hotel/model";
import { ROOM_LOOK } from "@/entities/hotel/ui/look";
import { useCan } from "@/entities/viewer";
import { formatMoney } from "@/shared/lib/format";
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, EmptyState, GlyphTile, IconInput, TONES } from "@/shared/ui";
import { applyHotelPick, hotelPickFromRoom, hotelSummary, roomSellsOn } from "../model/hotel-pick";
import { todayLocal } from "@/features/package-link";
import type { BookingDraft } from "../model/draft";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: BookingDraft;
  serviceKey?: string;
  onPicked: (next: Partial<BookingDraft>) => void;
};

/** Full-desk hotel catalogue: pick a contracted room at its satış price. */
export function PickHotelDialog({ open, onOpenChange, draft, serviceKey, onPicked }: Props) {
  const t = useTranslations("bookings.form");
  const th = useTranslations("hotels");
  const locale = useLocale();
  const canRead = useCan("hotels.read");
  const [repo] = useState(createHotelRepository);
  const [q, setQ] = useState("");
  const [hotels, setHotels] = useState<HotelListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hotelId, setHotelId] = useState(draft.hotel?.hotelId ?? "");
  const [detail, setDetail] = useState<HotelDetail | null>(null);
  const [checkIn, setCheckIn] = useState(draft.hotel?.checkIn || todayLocal());
  const [nights, setNights] = useState(draft.hotel?.nights || 1);

  useEffect(() => {
    if (!open || !canRead) return;
    let alive = true;
    setLoading(true);
    void repo.list({ activeOnly: true }).then((list) => {
      if (!alive) return;
      setHotels(list);
      setLoading(false);
    }).catch(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [open, canRead, repo]);

  useEffect(() => {
    if (!open || !hotelId) {
      setDetail(null);
      return;
    }
    let alive = true;
    void repo.get(hotelId).then((d) => {
      if (alive) setDetail(d);
    }).catch(() => {
      if (alive) setDetail(null);
    });
    return () => {
      alive = false;
    };
  }, [open, hotelId, repo]);

  const filtered = useMemo(() => {
    const words = q.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return hotels;
    return hotels.filter((h) => {
      const text = `${h.name} ${h.nameAr} ${h.location.city} ${h.location.country}`.toLocaleLowerCase();
      return words.every((w) => text.includes(w));
    });
  }, [hotels, q]);

  const rooms = detail ? roomSellsOn(detail, checkIn) : [];

  function choose(roomType: RoomType) {
    if (!detail) return;
    const pick = hotelPickFromRoom(detail, roomType, checkIn, nights);
    if (!pick) return;
    onPicked(applyHotelPick(draft, pick, { serviceKey }));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[80]"
        className="z-[80] flex h-[min(92vh,920px)] w-[min(96vw,1100px)] max-w-none flex-col gap-0 overflow-hidden bg-[#f7f5f6] p-0 sm:p-0"
        data-testid="create-booking-hotel-dialog"
      >
        <DialogHeader className="shrink-0 space-y-0 border-b border-zinc-200/60 bg-white/80 px-5 py-4 backdrop-blur-xl sm:px-8 sm:py-5">
          <div className="flex items-center gap-3.5 pe-10">
            <GlyphTile icon={Building2} tone="sky" size="xl" />
            <div className="min-w-0">
              <DialogTitle className="text-[20px] leading-tight tracking-tight sm:text-[22px]">{t("pickHotelTitle")}</DialogTitle>
              <DialogDescription className="mt-1 text-[13px] leading-snug sm:text-[13.5px]">{t("pickHotelHint")}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="shrink-0 border-b border-zinc-200/50 bg-white/60 px-5 py-4 sm:px-8">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <IconInput icon={Search} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("pickHotelSearch")} data-testid="create-booking-hotel-search" />
            <label className="flex flex-col gap-1 text-[11.5px] font-semibold text-zinc-500">
              {t("hotelCheckIn")}
              <input type="date" className="h-11 rounded-2xl border border-zinc-200 bg-white px-3 text-[14px] font-semibold text-zinc-900" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} data-testid="create-booking-hotel-checkin" />
            </label>
            <label className="flex flex-col gap-1 text-[11.5px] font-semibold text-zinc-500">
              {t("hotelNights")}
              <input type="number" min={1} max={60} className="h-11 w-24 rounded-2xl border border-zinc-200 bg-white px-3 text-[14px] font-semibold text-zinc-900" value={nights} onChange={(e) => setNights(Math.max(1, Number(e.target.value) || 1))} data-testid="create-booking-hotel-nights" />
            </label>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8">
          {!canRead ? (
            <EmptyState icon={Building2} title={t("hotelForbidden")} description={t("hotelForbiddenHint")} />
          ) : loading ? (
            <p className="py-16 text-center text-[13.5px] font-medium text-zinc-500">{t("hotelSearching")}</p>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Building2} title={t("hotelEmpty")} description={t("hotelEmptyHint")} />
          ) : (
            <ol className="space-y-4">
              {filtered.map((h) => {
                const active = hotelId === h.id;
                return (
                  <li key={h.id} className="rounded-[26px] bg-white p-4 ring-1 ring-sky-100/80 sm:p-5" data-testid={`create-booking-hotel-${h.id}`}>
                    <button type="button" className="flex w-full items-center gap-3 text-start" onClick={() => setHotelId(h.id)}>
                      <GlyphTile icon={Building2} tone="sky" size="section" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[16px] font-semibold text-zinc-950">{locale === "ar" && h.nameAr ? h.nameAr : h.name}</p>
                        <p className="text-[12.5px] font-medium text-zinc-500">
                          {[h.location.city, h.location.country].filter(Boolean).join(" · ")}
                          {h.summary.fromSell > 0 ? ` · ${formatMoney(h.summary.fromSell, locale, h.currency)}` : ""}
                        </p>
                      </div>
                    </button>
                    {active && detail?.hotel.id === h.id ? (
                      rooms.length === 0 ? (
                        <p className="mt-3 text-[13px] font-medium text-zinc-500">{t("hotelNoRooms")}</p>
                      ) : (
                        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                          {rooms.map((row) => {
                            const look = ROOM_LOOK[row.roomType];
                            const Icon = look.icon;
                            const selected = draft.hotel?.hotelId === h.id && draft.hotel.roomType === row.roomType;
                            return (
                              <li key={row.roomType}>
                                <Button
                                  type="button"
                                  variant={selected ? "default" : "outline"}
                                  className="h-auto w-full justify-start gap-3 rounded-[20px] px-3.5 py-3"
                                  data-testid={`create-booking-hotel-room-${row.roomType}`}
                                  onClick={() => choose(row.roomType)}
                                >
                                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${TONES[look.tone].soft}`}>
                                    <Icon className="h-5 w-5" aria-hidden />
                                  </span>
                                  <span className="min-w-0 flex-1 text-start">
                                    <span className="block truncate text-[14px] font-semibold">{th(`room.${row.roomType}`)}</span>
                                    <span className="block text-[12px] font-medium text-zinc-500">{formatMoney(row.sell, locale, h.currency)}</span>
                                  </span>
                                </Button>
                              </li>
                            );
                          })}
                        </ul>
                      )
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function HotelPickedCard({ draft, onChange }: { draft: BookingDraft; onChange: () => void }) {
  const t = useTranslations("bookings.form");
  if (!draft.hotel) return null;
  return (
    <div className="flex flex-col gap-3 rounded-[22px] bg-sky-50/70 px-3.5 py-3 ring-1 ring-sky-100 sm:flex-row sm:items-center" data-testid="create-booking-hotel-picked">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <GlyphTile icon={Building2} tone="sky" size="section" />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold leading-tight text-zinc-950">{hotelSummary(draft.hotel)}</p>
          <p className="mt-1 truncate text-[12.5px] font-medium text-zinc-500">{t("hotelNightsCount", { n: draft.hotel.nights })}</p>
        </div>
      </div>
      <Button type="button" variant="outline" className="h-11 shrink-0" data-testid="create-booking-change-hotel" onClick={onChange}>
        {t("changeHotel")}
      </Button>
    </div>
  );
}
