"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Ban, CalendarClock, CalendarOff, PencilLine, Plus, Trash2, Warehouse } from "lucide-react";
import {
  ALLOTMENT_KIND_LOOK,
  ALLOTMENT_STATUS_LOOK,
  ROOM_LOOK,
  fillPct,
  releaseIn,
  type Allotment,
  type HotelDetail,
  type HotelRepository,
  type StopSale,
} from "@/entities/hotel";
import { AllotmentCounter, AllotmentDialog, StopSaleDialog } from "@/features/hotel-inventory";
import { cn } from "@/shared/lib/cn";
import { formatDay } from "@/shared/lib/format";
import { Button, ConfirmDialog, EmptyState, IconButton, InfoSection, TONES, useMutationFeedback } from "@/shared/ui";
import { StopSaleCalendar } from "./stop-sale-calendar";

type Props = {
  detail: HotelDetail;
  repository: HotelRepository;
  canWrite: boolean;
  onChanged: () => void;
  onAllotment: (allotment: Allotment) => void;
};

type Deleting = { kind: "allotment"; item: Allotment } | { kind: "stop"; item: StopSale };

function AllotmentCard({
  allotment,
  detail,
  repository,
  canWrite,
  onAllotment,
  onEdit,
  onDelete,
}: {
  allotment: Allotment;
  detail: HotelDetail;
  repository: HotelRepository;
  canWrite: boolean;
  onAllotment: (a: Allotment) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("hotels");
  const locale = useLocale();
  const room = ROOM_LOOK[allotment.roomType];
  const kind = ALLOTMENT_KIND_LOOK[allotment.kind];
  const status = ALLOTMENT_STATUS_LOOK[allotment.status];
  const RoomIcon = room.icon;
  const KindIcon = kind.icon;
  const StatusIcon = status.icon;
  const fill = fillPct(allotment.sold, allotment.rooms);
  const days = releaseIn(allotment, detail.today);
  const releaseTone = allotment.kind !== "guaranteed" ? null : days < 0 ? "zinc" : days <= 3 ? "rose" : days <= 7 ? "amber" : "violet";

  return (
    <li className="rounded-[24px] border border-zinc-200/60 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]" data-testid={`allotment-card-${allotment.id}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]", TONES[room.tone].gradient)} aria-hidden>
          <RoomIcon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-[15px] font-semibold text-zinc-950">{t(`room.${allotment.roomType}`)}</h3>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", TONES[kind.tone].soft)}>
              <KindIcon className="h-3 w-3" aria-hidden />
              {t(`allotmentKind.${allotment.kind}`)}
            </span>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", TONES[status.tone].soft)} data-testid={`allotment-status-${allotment.id}`}>
              <StatusIcon className="h-3 w-3" aria-hidden />
              {t(`allotmentStatus.${allotment.status}`)}
            </span>
          </div>
          <p className="mt-0.5 text-[12.5px] font-medium text-zinc-500">
            {formatDay(allotment.startDate, locale)} – {formatDay(allotment.endDate, locale)}
          </p>
        </div>
        <AllotmentCounter repository={repository} allotment={allotment} disabled={!canWrite} onChanged={onAllotment} />
        {canWrite ? (
          <div className="flex gap-1">
            <IconButton label={t("allotment.edit")} variant="ghost" onClick={onEdit}>
              <PencilLine className="h-4 w-4" />
            </IconButton>
            <IconButton label={t("allotment.delete")} variant="ghost" className="text-rose-600" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </div>
        ) : null}
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-zinc-100" aria-hidden>
        <span className={cn("block h-full rounded-full transition-all", fill >= 90 ? "bg-rose-500" : fill >= 60 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${fill}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[12px] font-semibold">
        <span className="text-zinc-500">
          {t("allotment.soldOf", { sold: allotment.sold, rooms: allotment.rooms })} ·{" "}
          <span className={allotment.available > 0 ? "text-emerald-600" : "text-zinc-400"}>{t("allotment.available", { n: allotment.available })}</span>
        </span>
        {releaseTone ? (
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1", TONES[releaseTone].soft)} data-testid={`allotment-release-${allotment.id}`}>
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            {days < 0
              ? t("allotment.releasedOn", { date: formatDay(allotment.releaseDate, locale) })
              : days === 0
                ? t("allotment.releaseToday")
                : t("allotment.releaseIn", { n: days, date: formatDay(allotment.releaseDate, locale) })}
          </span>
        ) : (
          <span className="text-amber-700">{t("allotment.onRequestNote")}</span>
        )}
      </div>
      {allotment.notes ? <p className="mt-2 text-[12px] text-zinc-500">{allotment.notes}</p> : null}
    </li>
  );
}

export function InventoryTab({ detail, repository, canWrite, onChanged, onAllotment }: Props) {
  const t = useTranslations("hotels");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const [editing, setEditing] = useState<Allotment | null>(null);
  const [creating, setCreating] = useState(false);
  const [stopDay, setStopDay] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Deleting | null>(null);
  const [pending, setPending] = useState(false);
  const allotments = useMemo(
    () => [...detail.allotments].sort((a, b) => Number(a.status === "expired") - Number(b.status === "expired") || a.startDate.localeCompare(b.startDate)),
    [detail.allotments],
  );
  const stops = useMemo(() => detail.stopSales.filter((s) => s.endDate >= detail.today).sort((a, b) => a.startDate.localeCompare(b.startDate)), [detail.stopSales, detail.today]);

  async function remove() {
    if (!deleting) return;
    setPending(true);
    try {
      if (deleting.kind === "allotment") await repository.deleteAllotment(detail.hotel.id, deleting.item.id);
      else await repository.deleteStopSale(detail.hotel.id, deleting.item.id);
      feedback.success(deleting.kind === "allotment" ? t("allotment.deleted") : t("stopSale.deleted"));
      setDeleting(null);
      onChanged();
    } catch (e) {
      feedback.error(e, t("inventory.deleteError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <InfoSection
        icon={Warehouse}
        tone="emerald"
        title={t("allotment.title")}
        badge={allotments.length ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">{allotments.length}</span> : null}
        action={
          canWrite ? (
            <Button size="sm" onClick={() => setCreating(true)} data-testid="allotment-create">
              <Plus className="h-4 w-4" aria-hidden />
              {t("allotment.add")}
            </Button>
          ) : null
        }
        data-testid="hotel-allotments"
      >
        {allotments.length === 0 ? (
          <EmptyState icon={Warehouse} title={t("allotment.empty")} description={t("allotment.emptyHint")} />
        ) : (
          <ul className="space-y-3">
            {allotments.map((a) => (
              <AllotmentCard
                key={a.id}
                allotment={a}
                detail={detail}
                repository={repository}
                canWrite={canWrite}
                onAllotment={onAllotment}
                onEdit={() => setEditing(a)}
                onDelete={() => setDeleting({ kind: "allotment", item: a })}
              />
            ))}
          </ul>
        )}
      </InfoSection>

      <InfoSection
        icon={Ban}
        tone="rose"
        title={t("stopSale.title")}
        action={
          canWrite ? (
            <Button size="sm" variant="outline" onClick={() => setStopDay(detail.today)} data-testid="stop-sale-create">
              <Plus className="h-4 w-4" aria-hidden />
              {t("stopSale.add")}
            </Button>
          ) : null
        }
        data-testid="hotel-stop-sales"
      >
        <StopSaleCalendar today={detail.today} stopSales={detail.stopSales} allotments={detail.allotments} onPick={canWrite ? setStopDay : undefined} />
        <div className="mt-4 border-t border-zinc-100 pt-3">
          {stops.length === 0 ? (
            <p className="flex items-center gap-2 text-[12.5px] font-medium text-zinc-400">
              <CalendarOff className="h-4 w-4" aria-hidden />
              {t("stopSale.none")}
            </p>
          ) : (
            <ul className="space-y-2">
              {stops.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-[18px] bg-rose-50/70 px-3 py-2.5" data-testid={`stop-sale-${s.id}`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white" aria-hidden>
                    <Ban className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-zinc-900">
                      {formatDay(s.startDate, locale)}
                      {s.endDate !== s.startDate ? ` – ${formatDay(s.endDate, locale)}` : ""}
                    </p>
                    <p className="truncate text-[12px] text-zinc-500">
                      {s.roomType ? t(`room.${s.roomType}`) : t("stopSale.allRooms")}
                      {s.reason ? ` · ${s.reason}` : ""}
                    </p>
                  </div>
                  {canWrite ? (
                    <IconButton label={t("stopSale.delete")} variant="ghost" className="text-rose-600" onClick={() => setDeleting({ kind: "stop", item: s })}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </InfoSection>

      <AllotmentDialog
        repository={repository}
        hotel={detail.hotel}
        allotment={editing}
        open={creating || Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
        onSaved={onChanged}
      />
      <StopSaleDialog
        repository={repository}
        hotel={detail.hotel}
        defaultDate={stopDay ?? undefined}
        open={Boolean(stopDay)}
        onOpenChange={(open) => !open && setStopDay(null)}
        onSaved={onChanged}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={deleting?.kind === "stop" ? t("stopSale.deleteTitle") : t("allotment.deleteTitle")}
        description={deleting?.kind === "stop" ? t("stopSale.deleteHint") : t("allotment.deleteHint")}
        confirmLabel={t("inventory.delete")}
        cancelLabel={tc("cancel")}
        onConfirm={() => void remove()}
        pending={pending}
        destructive
      />
    </div>
  );
}
