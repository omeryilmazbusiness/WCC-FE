"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BadgePercent, CalendarPlus, CalendarRange, PencilLine, Trash2 } from "lucide-react";
import {
  OCCUPANCIES,
  ROOM_LOOK,
  SEASON_LOOK,
  MEAL_LOOK,
  addDays,
  daysBetween,
  grossCell,
  markupFor,
  type HotelDetail,
  type HotelRepository,
  type Season,
} from "@/entities/hotel";
import { SeasonDialog } from "@/features/hotel-season";
import { cn } from "@/shared/lib/cn";
import { formatDay, formatMoney } from "@/shared/lib/format";
import { Button, ConfirmDialog, EmptyState, IconButton, TONES, useMutationFeedback } from "@/shared/ui";

type Props = {
  detail: HotelDetail;
  repository: HotelRepository;
  canWrite: boolean;
  onChanged: () => void;
};

/** Seasons laid on one strip so gaps and the current period are visible at a glance. */
function SeasonTimeline({ seasons, today }: { seasons: Season[]; today: string }) {
  const t = useTranslations("hotels");
  const locale = useLocale();
  const start = [today, ...seasons.map((s) => s.startDate)].sort()[0];
  const end = [addDays(today, 30), ...seasons.map((s) => s.endDate)].sort().at(-1)!;
  const total = daysBetween(start, end) + 1;
  const pct = (day: string) => (daysBetween(start, day) / total) * 100;

  return (
    <div className="rounded-[26px] border border-zinc-200/60 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5" data-testid="season-timeline">
      <div className="mb-3 flex items-center justify-between text-[11.5px] font-semibold text-zinc-400">
        <span>{formatDay(start, locale)}</span>
        <span>{formatDay(end, locale)}</span>
      </div>
      <div className="relative h-12 overflow-hidden rounded-2xl bg-zinc-100/80">
        {seasons.map((s) => {
          const look = SEASON_LOOK[s.kind];
          return (
            <div
              key={s.id}
              className={cn("absolute inset-y-1 flex items-center overflow-hidden rounded-xl px-2", TONES[look.tone].solid)}
              style={{ insetInlineStart: `${pct(s.startDate)}%`, width: `max(${((daysBetween(s.startDate, s.endDate) + 1) / total) * 100}%, 6px)` }}
              title={`${s.name} · ${formatDay(s.startDate, locale)} – ${formatDay(s.endDate, locale)}`}
            >
              <span className="truncate text-[11.5px] font-bold">{s.name}</span>
            </div>
          );
        })}
        <div className="absolute inset-y-0 w-0.5 bg-zinc-950" style={{ insetInlineStart: `${pct(today)}%` }} aria-hidden />
      </div>
      <p className="mt-2 text-[11.5px] font-medium text-zinc-500">{t("rates.timelineHint", { date: formatDay(today, locale) })}</p>
    </div>
  );
}

function SeasonCard({
  season,
  detail,
  canWrite,
  onEdit,
  onDelete,
}: {
  season: Season;
  detail: HotelDetail;
  canWrite: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("hotels");
  const locale = useLocale();
  const { hotel, today } = detail;
  const look = SEASON_LOOK[season.kind];
  const Icon = look.icon;
  const markup = markupFor(hotel, season);
  const current = season.startDate <= today && today <= season.endDate;
  const past = season.endDate < today;
  const money = (v: number) => formatMoney(v, locale, hotel.currency);

  return (
    <article
      className={cn("overflow-hidden rounded-[26px] border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]", current ? "border-zinc-900/70 ring-1 ring-zinc-900/70" : "border-zinc-200/60", past && "opacity-70")}
      data-testid={`season-card-${season.id}`}
    >
      <header className={cn("flex flex-wrap items-center gap-3 bg-gradient-to-br p-4", TONES[look.tone].tint)}>
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]", TONES[look.tone].gradient)} aria-hidden>
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-[16px] font-semibold tracking-tight text-zinc-950">{season.name}</h3>
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", TONES[look.tone].soft)}>{t(`seasonKind.${season.kind}`)}</span>
            {current ? <span className="rounded-full bg-zinc-950 px-2 py-0.5 text-[11px] font-bold text-white">{t("rates.current")}</span> : null}
            {past ? <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-500">{t("rates.past")}</span> : null}
          </div>
          <p className="mt-0.5 text-[12.5px] font-medium text-zinc-500">
            {formatDay(season.startDate, locale)} – {formatDay(season.endDate, locale)} · {t("season.nights", { n: daysBetween(season.startDate, season.endDate) + 1 })}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[11.5px] font-semibold text-zinc-700 ring-1 ring-inset ring-zinc-900/5">
          <BadgePercent className="h-3.5 w-3.5 text-amber-500" aria-hidden />
          {markup.kind === "percent" ? `+${markup.value / 100}%` : `+${money(markup.value)}`}
          {season.markup ? null : <span className="text-zinc-400">· {t("rates.hotelDefault")}</span>}
        </span>
        {canWrite ? (
          <div className="flex gap-1">
            <IconButton label={t("rates.edit")} variant="ghost" onClick={onEdit} data-testid={`season-edit-${season.id}`}>
              <PencilLine className="h-4 w-4" />
            </IconButton>
            <IconButton label={t("rates.delete")} variant="ghost" className="text-rose-600" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </div>
        ) : null}
      </header>
      <div className="overflow-x-auto p-4 pt-3">
        <table className="w-full min-w-[560px] text-[13px]">
          <thead>
            <tr className="text-[11.5px] font-semibold text-zinc-500">
              <th className="py-1.5 text-start font-semibold">{t("season.roomMeal")}</th>
              {OCCUPANCIES.map((o) => (
                <th key={o} className="py-1.5 text-end font-semibold">
                  {t(`occupancy.${o}`)}
                  <span className="block text-[10.5px] font-medium text-zinc-400">{o === "single" ? t("season.perRoom") : t("season.perPerson")}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {season.rates.map((r) => {
              const room = ROOM_LOOK[r.roomType];
              const meal = MEAL_LOOK[r.mealPlan];
              const RoomIcon = room.icon;
              return (
                <tr key={`${r.roomType}/${r.mealPlan}`}>
                  <td className="py-2 pe-3">
                    <span className="flex items-center gap-2">
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", TONES[room.tone].soft)} aria-hidden>
                        <RoomIcon className="h-4 w-4" />
                      </span>
                      <span className="font-semibold text-zinc-900">{t(`room.${r.roomType}`)}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", TONES[meal.tone].soft)}>{t(`meal.${r.mealPlan}.short`)}</span>
                    </span>
                  </td>
                  {OCCUPANCIES.map((o) => (
                    <td key={o} className="py-2 text-end tabular-nums">
                      {r[o] > 0 ? (
                        <>
                          <span className="block font-semibold text-zinc-900">{money(grossCell(r[o], markup))}</span>
                          <span className="block text-[11px] text-zinc-400">{t("rates.net", { amount: money(r[o]) })}</span>
                        </>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export function RatesTab({ detail, repository, canWrite, onChanged }: Props) {
  const t = useTranslations("hotels");
  const tc = useTranslations("common");
  const feedback = useMutationFeedback();
  const [editing, setEditing] = useState<Season | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Season | null>(null);
  const [pending, setPending] = useState(false);
  const seasons = useMemo(() => [...detail.seasons].sort((a, b) => a.startDate.localeCompare(b.startDate)), [detail.seasons]);

  async function remove() {
    if (!deleting) return;
    setPending(true);
    try {
      await repository.deleteSeason(detail.hotel.id, deleting.id);
      feedback.success(t("rates.deleted"));
      setDeleting(null);
      onChanged();
    } catch (e) {
      feedback.error(e, t("rates.deleteError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-zinc-500">{t("rates.hint")}</p>
        {canWrite ? (
          <Button onClick={() => setCreating(true)} data-testid="season-create">
            <CalendarPlus className="h-4 w-4" aria-hidden />
            {t("rates.add")}
          </Button>
        ) : null}
      </div>

      {seasons.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title={t("rates.empty")}
          description={t("rates.emptyHint")}
          actionLabel={canWrite ? t("rates.add") : undefined}
          onAction={canWrite ? () => setCreating(true) : undefined}
        />
      ) : (
        <>
          <SeasonTimeline seasons={seasons} today={detail.today} />
          {seasons.map((s) => (
            <SeasonCard key={s.id} season={s} detail={detail} canWrite={canWrite} onEdit={() => setEditing(s)} onDelete={() => setDeleting(s)} />
          ))}
        </>
      )}

      <SeasonDialog
        repository={repository}
        hotel={detail.hotel}
        seasons={detail.seasons}
        season={editing}
        open={creating || Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
        onSaved={onChanged}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("rates.deleteTitle", { name: deleting?.name ?? "" })}
        description={t("rates.deleteHint")}
        confirmLabel={t("rates.delete")}
        cancelLabel={tc("cancel")}
        onConfirm={() => void remove()}
        pending={pending}
        destructive
      />
    </div>
  );
}
