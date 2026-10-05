"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  BadgePercent,
  BedDouble,
  Building2,
  Coins,
  Hotel as HotelIcon,
  Mail,
  MapPin,
  MapPinned,
  Navigation,
  NotebookPen,
  Phone,
  Power,
  Ruler,
  Send,
  UserRound,
  UtensilsCrossed,
} from "lucide-react";
import {
  HOTEL_CURRENCIES,
  LANDMARKS,
  LANDMARK_LOOK,
  MEAL_LOOK,
  MEAL_PLANS,
  ROOM_LOOK,
  ROOM_TYPES,
  applyMarkup,
  mapsUrl,
  type Hotel,
  type HotelRepository,
} from "@/entities/hotel";
import { isApiError } from "@/shared/api/api-error";
import { cn } from "@/shared/lib/cn";
import { formatMoney } from "@/shared/lib/format";
import {
  ActionDialog,
  Button,
  ChipSet,
  ChoiceGrid,
  Field,
  FormSection,
  IconInput,
  Input,
  SegmentedControl,
  StarPicker,
  SwitchRow,
  Textarea,
  useMutationFeedback,
} from "@/shared/ui";
import {
  SERVER_FIELD,
  draftErrors,
  draftFromHotel,
  draftToInput,
  newDraft,
  type HotelDraft,
  type HotelDraftField,
} from "../model/draft";

type Props = {
  repository: HotelRepository;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit mode when set. */
  hotel?: Hotel | null;
  onSaved: (hotel: Hotel) => void;
};

const SAMPLE_NET = 100_00;

function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="text-[12px] font-medium text-rose-600">{children}</p>;
}

/** Create / edit the hotel profile: identity, location, contacts, offer and commercial terms. */
export function HotelFormDialog({ repository, open, onOpenChange, hotel, onSaved }: Props) {
  const t = useTranslations("hotels");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const [draft, setDraft] = useState<HotelDraft>(newDraft);
  const [touched, setTouched] = useState(false);
  const [serverErrors, setServerErrors] = useState<Partial<Record<HotelDraftField, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(hotel ? draftFromHotel(hotel) : newDraft());
    setTouched(false);
    setServerErrors({});
  }, [open, hotel]);

  const errors = useMemo(() => draftErrors(draft), [draft]);
  const invalid = Object.keys(errors).length > 0;
  const set = <K extends keyof HotelDraft>(key: K, value: HotelDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setServerErrors((s) => {
      const next = { ...s };
      delete next[key as HotelDraftField];
      return next;
    });
  };
  const err = (f: HotelDraftField) =>
    serverErrors[f] ?? (touched && errors[f] ? t(`form.errors.${errors[f]}`) : undefined);

  const preview = useMemo(() => {
    const input = draftToInput(draft);
    return applyMarkup(SAMPLE_NET, input.markup, 1);
  }, [draft]);

  async function submit() {
    setTouched(true);
    if (invalid) return;
    setSaving(true);
    try {
      const input = draftToInput(draft, hotel ?? undefined);
      const saved = hotel ? await repository.update(hotel.id, input) : await repository.create(input);
      feedback.success(hotel ? t("form.updated") : t("form.created"));
      onSaved(saved);
      onOpenChange(false);
    } catch (e) {
      if (isApiError(e) && e.fieldErrors) {
        const mapped: Partial<Record<HotelDraftField, string>> = {};
        for (const [k, v] of Object.entries(e.fieldErrors)) if (SERVER_FIELD[k]) mapped[SERVER_FIELD[k]] = v;
        setServerErrors(mapped);
      }
      feedback.error(e, t("form.saveError"));
    } finally {
      setSaving(false);
    }
  }

  const mapsHref = draft.name.trim() || draft.city.trim() ? mapsUrl(draftToInput(draft)) : null;

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={HotelIcon}
      tone="sky"
      size="xl"
      title={hotel ? t("form.editTitle") : t("form.createTitle")}
      description={t("form.subtitle")}
      testId="hotel-form-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={saving || (touched && invalid)} onClick={() => void submit()} data-testid="hotel-form-submit">
            {saving ? t("saving") : hotel ? tc("save") : t("form.create")}
          </Button>
        </>
      }
    >
      <div className="space-y-4 pb-2">
        <FormSection icon={Building2} tone="sky" title={t("form.identity.title")} hint={t("form.identity.hint")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("form.identity.name")} htmlFor="hotel-name">
              <IconInput id="hotel-name" icon={HotelIcon} value={draft.name} onChange={(e) => set("name", e.target.value)} maxLength={160} data-testid="hotel-name" />
              <FieldError>{err("name")}</FieldError>
            </Field>
            <Field label={t("form.identity.nameAr")} htmlFor="hotel-name-ar">
              <Input id="hotel-name-ar" dir="rtl" className="h-12" value={draft.nameAr} onChange={(e) => set("nameAr", e.target.value)} maxLength={160} />
            </Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="mb-1 text-[12.5px] font-semibold text-zinc-600">{t("form.identity.stars")}</p>
              <StarPicker value={draft.stars} onChange={(v) => set("stars", v)} label={t("form.identity.stars")} />
            </div>
            <div className="min-w-[240px] flex-1 sm:max-w-sm">
              <SwitchRow
                icon={Power}
                tone="emerald"
                label={t("form.identity.active")}
                hint={t("form.identity.activeHint")}
                checked={draft.isActive}
                onChange={(v) => set("isActive", v)}
                testId="hotel-active"
              />
            </div>
          </div>
        </FormSection>

        <FormSection icon={MapPinned} tone="emerald" title={t("form.location.title")} hint={t("form.location.hint")}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("form.location.city")} htmlFor="hotel-city">
              <IconInput id="hotel-city" icon={MapPin} value={draft.city} onChange={(e) => set("city", e.target.value)} maxLength={80} data-testid="hotel-city" />
              <FieldError>{err("city")}</FieldError>
            </Field>
            <Field label={t("form.location.district")} htmlFor="hotel-district">
              <Input id="hotel-district" className="h-12" value={draft.district} onChange={(e) => set("district", e.target.value)} maxLength={120} />
            </Field>
            <Field label={t("form.location.country")} htmlFor="hotel-country" hint={t("form.location.countryHint")}>
              <Input
                id="hotel-country"
                className="h-12 uppercase"
                value={draft.country}
                onChange={(e) => set("country", e.target.value.toUpperCase().slice(0, 2))}
                maxLength={2}
              />
              <FieldError>{err("country")}</FieldError>
            </Field>
          </div>
          <div>
            <p className="mb-2 text-[12.5px] font-semibold text-zinc-600">{t("form.location.landmark")}</p>
            <ChoiceGrid
              name="hotel-landmark"
              columns={4}
              value={draft.landmark}
              onChange={(v) => set("landmark", v)}
              options={LANDMARKS.map((l) => ({ value: l, label: t(`landmark.${l}`), ...LANDMARK_LOOK[l] }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("form.location.distance")} htmlFor="hotel-distance">
              <div className="relative">
                <IconInput
                  id="hotel-distance"
                  icon={Ruler}
                  inputMode="numeric"
                  value={draft.distance}
                  onChange={(e) => set("distance", e.target.value.replace(/\D/g, ""))}
                  className="pe-12 tabular-nums"
                  data-testid="hotel-distance"
                />
                <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-zinc-400">m</span>
              </div>
              <FieldError>{err("distance")}</FieldError>
            </Field>
            <Field label={t("form.location.latitude")} htmlFor="hotel-lat">
              <Input id="hotel-lat" dir="ltr" inputMode="decimal" className="h-12 tabular-nums" value={draft.latitude} onChange={(e) => set("latitude", e.target.value)} placeholder="21.4225" />
              <FieldError>{err("latitude")}</FieldError>
            </Field>
            <Field label={t("form.location.longitude")} htmlFor="hotel-lng">
              <Input id="hotel-lng" dir="ltr" inputMode="decimal" className="h-12 tabular-nums" value={draft.longitude} onChange={(e) => set("longitude", e.target.value)} placeholder="39.8262" />
              <FieldError>{err("longitude")}</FieldError>
            </Field>
          </div>
          {mapsHref ? (
            <a href={mapsHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-emerald-700 hover:underline">
              <Navigation className="h-3.5 w-3.5" aria-hidden />
              {t("form.location.preview")}
            </a>
          ) : null}
        </FormSection>

        <FormSection icon={UserRound} tone="violet" title={t("form.contact.title")} hint={t("form.contact.hint")}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("form.contact.salesName")} htmlFor="hotel-sales-name">
              <IconInput id="hotel-sales-name" icon={UserRound} value={draft.salesName} onChange={(e) => set("salesName", e.target.value)} maxLength={120} />
            </Field>
            <Field label={t("form.contact.salesPhone")} htmlFor="hotel-sales-phone">
              <IconInput id="hotel-sales-phone" icon={Phone} dir="ltr" type="tel" value={draft.salesPhone} onChange={(e) => set("salesPhone", e.target.value)} placeholder="+966 …" />
              <FieldError>{err("salesPhone")}</FieldError>
            </Field>
            <Field label={t("form.contact.salesEmail")} htmlFor="hotel-sales-email">
              <IconInput id="hotel-sales-email" icon={Mail} dir="ltr" type="email" value={draft.salesEmail} onChange={(e) => set("salesEmail", e.target.value)} />
              <FieldError>{err("salesEmail")}</FieldError>
            </Field>
          </div>
          <Field label={t("form.contact.reservationsEmail")} htmlFor="hotel-res-email" hint={t("form.contact.reservationsHint")}>
            <IconInput
              id="hotel-res-email"
              icon={Send}
              dir="ltr"
              type="email"
              value={draft.reservationsEmail}
              onChange={(e) => set("reservationsEmail", e.target.value)}
              data-testid="hotel-res-email"
            />
            <FieldError>{err("reservationsEmail")}</FieldError>
          </Field>
        </FormSection>

        <FormSection icon={BedDouble} tone="indigo" title={t("form.offer.title")} hint={t("form.offer.hint")}>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-zinc-600">
              <BedDouble className="h-4 w-4 text-indigo-500" aria-hidden />
              {t("form.offer.roomTypes")}
            </p>
            <ChipSet
              name="hotel-room"
              tone="indigo"
              values={draft.roomTypes}
              onChange={(v) => set("roomTypes", ROOM_TYPES.filter((r) => v.includes(r)))}
              options={ROOM_TYPES.map((r) => ({ value: r, label: t(`room.${r}`), icon: ROOM_LOOK[r].icon }))}
            />
            <FieldError>{err("roomTypes")}</FieldError>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-zinc-600">
              <UtensilsCrossed className="h-4 w-4 text-amber-500" aria-hidden />
              {t("form.offer.mealPlans")}
            </p>
            <ChipSet
              name="hotel-meal"
              tone="amber"
              values={draft.mealPlans}
              onChange={(v) => set("mealPlans", MEAL_PLANS.filter((m) => v.includes(m)))}
              options={MEAL_PLANS.map((m) => ({ value: m, label: `${t(`meal.${m}.short`)} · ${t(`meal.${m}.label`)}`, icon: MEAL_LOOK[m].icon }))}
            />
            <FieldError>{err("mealPlans")}</FieldError>
          </div>
        </FormSection>

        <FormSection icon={Coins} tone="amber" title={t("form.commercial.title")} hint={t("form.commercial.hint")}>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="mb-2 text-[12.5px] font-semibold text-zinc-600">{t("form.commercial.currency")}</p>
              <SegmentedControl
                aria-label={t("form.commercial.currency")}
                value={draft.currency}
                onChange={(v) => set("currency", v)}
                options={HOTEL_CURRENCIES.map((c) => ({ value: c, label: c }))}
              />
            </div>
            <div>
              <p className="mb-2 text-[12.5px] font-semibold text-zinc-600">{t("form.commercial.markupKind")}</p>
              <SegmentedControl
                aria-label={t("form.commercial.markupKind")}
                value={draft.markupKind}
                onChange={(v) => set("markupKind", v)}
                options={[
                  { value: "percent", label: t("markup.percent"), icon: BadgePercent },
                  { value: "fixed", label: t("markup.fixed"), icon: Coins },
                ]}
              />
            </div>
            <div className="w-40">
              <p className="mb-2 text-[12.5px] font-semibold text-zinc-600">{t("form.commercial.markupValue")}</p>
              <div className="relative">
                <Input
                  inputMode="decimal"
                  value={draft.markupValue}
                  onChange={(e) => set("markupValue", e.target.value.replace(/[^\d.,]/g, ""))}
                  className="h-11 pe-14 text-[15px] font-semibold tabular-nums"
                  data-testid="hotel-markup"
                  aria-label={t("form.commercial.markupValue")}
                />
                <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 rounded-lg bg-zinc-100 px-2 py-1 text-[11px] font-bold text-zinc-500">
                  {draft.markupKind === "percent" ? "%" : draft.currency}
                </span>
              </div>
            </div>
          </div>
          <FieldError>{err("markupValue")}</FieldError>
          <div className={cn("flex items-center gap-3 rounded-2xl bg-amber-50/70 px-4 py-3 text-[13px] text-amber-900")} data-testid="hotel-markup-preview">
            <BadgePercent className="h-5 w-5 shrink-0 text-amber-500" aria-hidden />
            <span>
              {t("form.commercial.preview", {
                net: formatMoney(SAMPLE_NET, locale, draft.currency),
                gross: formatMoney(preview, locale, draft.currency),
              })}
            </span>
          </div>
        </FormSection>

        <FormSection icon={NotebookPen} tone="zinc" title={t("form.notes.title")}>
          <Textarea value={draft.notes} onChange={(e) => set("notes", e.target.value)} maxLength={4000} rows={3} placeholder={t("form.notes.placeholder")} />
        </FormSection>
      </div>
    </ActionDialog>
  );
}
