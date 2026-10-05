"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BadgePercent, CalendarRange, Coins, Copy, Grid3x3, Tags } from "lucide-react";
import {
  MEAL_LOOK,
  OCCUPANCIES,
  ROOM_LOOK,
  SEASON_KINDS,
  SEASON_LOOK,
  daysBetween,
  grossCell,
  type Hotel,
  type HotelRepository,
  type Markup,
  type Occupancy,
  type Season,
} from "@/entities/hotel";
import { cn } from "@/shared/lib/cn";
import { formatDay, formatMoney } from "@/shared/lib/format";
import { ActionDialog, Button, ChoiceGrid, Field, FormSection, Input, SegmentedControl, SwitchRow, TONES, useMutationFeedback } from "@/shared/ui";
import {
  copyRates,
  draftMarkupValue,
  parseCell,
  seasonDraft,
  seasonDraftError,
  seasonInput,
  type SeasonDraft,
} from "../model/season-draft";

type Props = {
  repository: HotelRepository;
  hotel: Hotel;
  seasons: readonly Season[];
  season?: Season | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (season: Season) => void;
};

/** Create / edit a validity period and its net rate matrix with live gross prices. */
export function SeasonDialog({ repository, hotel, seasons, season, open, onOpenChange, onSaved }: Props) {
  const t = useTranslations("hotels");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const [draft, setDraft] = useState<SeasonDraft>(() => seasonDraft(hotel, season));
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(seasonDraft(hotel, season));
    setTouched(false);
  }, [open, hotel, season]);

  const others = useMemo(() => seasons.filter((s) => s.id !== season?.id), [seasons, season]);
  const error = seasonDraftError(draft, others, season?.id);
  const markup: Markup = draft.ownMarkup ? { kind: draft.markupKind, value: draftMarkupValue(draft) ?? 0 } : hotel.markup;
  const nights = draft.startDate && draft.endDate && draft.endDate >= draft.startDate ? daysBetween(draft.startDate, draft.endDate) + 1 : 0;
  const set = <K extends keyof SeasonDraft>(k: K, v: SeasonDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setCell = (i: number, o: Occupancy, v: string) =>
    setDraft((d) => ({
      ...d,
      rows: d.rows.map((r, j) => (j === i ? { ...r, cells: { ...r.cells, [o]: v.replace(/[^\d.,]/g, "") } } : r)),
    }));

  const errorText = (() => {
    if (!error) return null;
    if (error.field === "overlap") {
      return t("season.errors.overlap", {
        name: error.season.name,
        from: formatDay(error.season.startDate, locale),
        to: formatDay(error.season.endDate, locale),
      });
    }
    return t(`season.errors.${error.field}`);
  })();
  const showError = touched || error?.field === "overlap";

  async function submit() {
    setTouched(true);
    if (error) return;
    setSaving(true);
    try {
      const saved = await repository.saveSeason(hotel.id, season?.id ?? null, seasonInput(draft));
      feedback.success(season ? t("season.updated") : t("season.created"));
      onSaved(saved);
      onOpenChange(false);
    } catch (e) {
      feedback.error(e, t("season.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={CalendarRange}
      tone={SEASON_LOOK[draft.kind].tone}
      size="xl"
      title={season ? t("season.editTitle") : t("season.createTitle")}
      description={t("season.subtitle", { currency: hotel.currency })}
      testId="season-dialog"
      footer={
        <>
          {showError && errorText ? (
            <p className="me-auto self-center text-[12.5px] font-semibold text-rose-600" role="alert" data-testid="season-error">
              {errorText}
            </p>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={saving || (touched && Boolean(error))} onClick={() => void submit()} data-testid="season-submit">
            {saving ? t("saving") : tc("save")}
          </Button>
        </>
      }
    >
      <div className="space-y-4 pb-2">
        <FormSection icon={Tags} tone="sky" title={t("season.period")} hint={nights ? t("season.nights", { n: nights }) : t("season.periodHint")}>
          <ChoiceGrid
            name="season-kind"
            columns={4}
            value={draft.kind}
            onChange={(v) => set("kind", v)}
            options={SEASON_KINDS.map((k) => ({ value: k, label: t(`seasonKind.${k}`), ...SEASON_LOOK[k] }))}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("season.name")} htmlFor="season-name">
              <Input id="season-name" className="h-12" value={draft.name} maxLength={80} onChange={(e) => set("name", e.target.value)} placeholder={t("season.namePlaceholder")} data-testid="season-name" />
            </Field>
            <Field label={t("season.start")} htmlFor="season-start">
              <Input id="season-start" type="date" className="h-12" value={draft.startDate} onChange={(e) => set("startDate", e.target.value)} data-testid="season-start" />
            </Field>
            <Field label={t("season.end")} htmlFor="season-end">
              <Input id="season-end" type="date" className="h-12" min={draft.startDate || undefined} value={draft.endDate} onChange={(e) => set("endDate", e.target.value)} data-testid="season-end" />
            </Field>
          </div>
        </FormSection>

        <FormSection icon={BadgePercent} tone="amber" title={t("season.markup")} hint={t("season.markupHint")}>
          <SwitchRow
            icon={BadgePercent}
            tone="amber"
            label={t("season.ownMarkup")}
            hint={
              draft.ownMarkup
                ? undefined
                : t("season.hotelMarkup", {
                    value: hotel.markup.kind === "percent" ? `${hotel.markup.value / 100}%` : formatMoney(hotel.markup.value, locale, hotel.currency),
                  })
            }
            checked={draft.ownMarkup}
            onChange={(v) => set("ownMarkup", v)}
            testId="season-own-markup"
          />
          {draft.ownMarkup ? (
            <div className="flex flex-wrap items-center gap-3">
              <SegmentedControl
                aria-label={t("form.commercial.markupKind")}
                value={draft.markupKind}
                onChange={(v) => set("markupKind", v)}
                options={[
                  { value: "percent", label: t("markup.percent"), icon: BadgePercent },
                  { value: "fixed", label: t("markup.fixed"), icon: Coins },
                ]}
              />
              <div className="relative w-36">
                <Input
                  inputMode="decimal"
                  aria-label={t("form.commercial.markupValue")}
                  value={draft.markupValue}
                  onChange={(e) => set("markupValue", e.target.value.replace(/[^\d.,]/g, ""))}
                  className="h-11 pe-14 text-[15px] font-semibold tabular-nums"
                />
                <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 rounded-lg bg-zinc-100 px-2 py-1 text-[11px] font-bold text-zinc-500">
                  {draft.markupKind === "percent" ? "%" : hotel.currency}
                </span>
              </div>
            </div>
          ) : null}
        </FormSection>

        <FormSection
          icon={Grid3x3}
          tone="violet"
          title={t("season.matrix")}
          hint={t("season.matrixHint")}
          aside={
            others.length ? (
              <div className="hidden flex-wrap justify-end gap-1.5 sm:flex">
                {others.slice(0, 3).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDraft((d) => copyRates(d, hotel, s))}
                    className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-[11.5px] font-semibold text-zinc-600 transition hover:bg-zinc-200"
                    title={t("season.copyFrom", { name: s.name })}
                  >
                    <Copy className="h-3 w-3" aria-hidden />
                    {s.name}
                  </button>
                ))}
              </div>
            ) : null
          }
        >
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[640px] border-separate border-spacing-y-1.5 text-[13px]" data-testid="season-matrix">
              <thead>
                <tr className="text-start text-[11.5px] font-semibold text-zinc-500">
                  <th className="pb-1 text-start font-semibold">{t("season.roomMeal")}</th>
                  {OCCUPANCIES.map((o) => (
                    <th key={o} className="pb-1 text-start font-semibold">
                      {t(`occupancy.${o}`)}
                      <span className="block text-[10.5px] font-medium text-zinc-400">{o === "single" ? t("season.perRoom") : t("season.perPerson")}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {draft.rows.map((row, i) => {
                  const room = ROOM_LOOK[row.roomType];
                  const meal = MEAL_LOOK[row.mealPlan];
                  const RoomIcon = room.icon;
                  const firstOfRoom = i === 0 || draft.rows[i - 1].roomType !== row.roomType;
                  return (
                    <Fragment key={`${row.roomType}/${row.mealPlan}`}>
                      <tr className="align-top">
                        <td className="pe-3">
                          <div className={cn("flex items-center gap-2.5", !firstOfRoom && "ps-[46px]")}>
                            {firstOfRoom ? (
                              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", TONES[room.tone].soft)} aria-hidden>
                                <RoomIcon className="h-[18px] w-[18px]" />
                              </span>
                            ) : null}
                            <div className="min-w-0">
                              {firstOfRoom ? <p className="truncate font-semibold text-zinc-900">{t(`room.${row.roomType}`)}</p> : null}
                              <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold", TONES[meal.tone].soft)}>{t(`meal.${row.mealPlan}.short`)}</span>
                            </div>
                          </div>
                        </td>
                        {OCCUPANCIES.map((o) => {
                          const net = parseCell(row.cells[o]);
                          const bad = net == null;
                          return (
                            <td key={o} className="pe-2">
                              <Input
                                inputMode="decimal"
                                aria-label={`${t(`room.${row.roomType}`)} ${t(`meal.${row.mealPlan}.short`)} ${t(`occupancy.${o}`)}`}
                                value={row.cells[o]}
                                onChange={(e) => setCell(i, o, e.target.value)}
                                placeholder="—"
                                className={cn("h-10 text-[14px] font-semibold tabular-nums", bad && "border-rose-400 focus-visible:ring-rose-300")}
                                data-testid={`rate-${row.roomType}-${row.mealPlan}-${o}`}
                              />
                              <p className="mt-1 truncate text-[11px] font-semibold tabular-nums text-emerald-600">
                                {net && net > 0 ? `→ ${formatMoney(grossCell(net, markup), locale, hotel.currency)}` : "\u00a0"}
                              </p>
                            </td>
                          );
                        })}
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] font-medium text-zinc-500">{t("season.grossLegend")}</p>
        </FormSection>
      </div>
    </ActionDialog>
  );
}
