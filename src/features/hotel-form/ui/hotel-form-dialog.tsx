"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  BadgePercent,
  BedDouble,
  Building2,
  CalendarDays,
  Coins,
  Hotel as HotelIcon,
  Mail,
  MapPin,
  MapPinned,
  NotebookPen,
  Phone,
  Power,
  Send,
  UserRound,
  UtensilsCrossed,
} from "lucide-react";
import {
  HOTEL_CURRENCIES,
  MEAL_LOOK,
  MEAL_PLANS,
  ROOM_LOOK,
  ROOM_TYPES,
  applyMarkup,
  type Hotel,
  type HotelRepository,
  type MonthlyRate,
  type RoomType,
} from "@/entities/hotel";
import { isApiError } from "@/shared/api/api-error";
import { useCan } from "@/entities/viewer";
import { formatMoney } from "@/shared/lib/format";
import {
  ActionDialog,
  Button,
  ChipSet,
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
import { emptyRoomYear, pricedMonthCount, ratesByYear, roomYearFromRates, type RoomYearDraft } from "../model/room-month-draft";
import { RoomTypeRatesDialog } from "./room-type-rates-dialog";

const SAMPLE_NET = 100_00;
const EMPTY_RATES: MonthlyRate[] = [];

type Props = {
  repository: HotelRepository;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit mode when set. */
  hotel?: Hotel | null;
  monthlyRates?: MonthlyRate[];
  onSaved: (hotel: Hotel) => void;
};

function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="text-[12px] font-medium text-rose-600">{children}</p>;
}

/** Create / edit the hotel profile: identity, location, contacts, offer and commercial terms. */
export function HotelFormDialog({ repository, open, onOpenChange, hotel, monthlyRates = EMPTY_RATES, onSaved }: Props) {
  const t = useTranslations("hotels");
  const tc = useTranslations("common");
  const locale = useLocale();
  const canPrice = useCan("hotels.pricing");
  const feedback = useMutationFeedback();
  const [draft, setDraft] = useState<HotelDraft>(newDraft);
  const [touched, setTouched] = useState(false);
  const [serverErrors, setServerErrors] = useState<Partial<Record<HotelDraftField, string>>>({});
  const [saving, setSaving] = useState(false);
  const [sheets, setSheets] = useState<Partial<Record<RoomType, RoomYearDraft>>>({});
  const [pricingRoom, setPricingRoom] = useState<RoomType | null>(null);
  const ratesRef = useRef(monthlyRates);
  ratesRef.current = monthlyRates;
  const session = useRef(false);

  useEffect(() => {
    if (!open) {
      session.current = false;
      return;
    }
    if (session.current) return;
    session.current = true;
    const next = hotel ? draftFromHotel(hotel) : newDraft();
    setDraft(next);
    setTouched(false);
    setServerErrors({});
    setPricingRoom(null);
    const year = new Date().getFullYear();
    const fallback = hotel?.markup ?? { kind: "percent", value: 1500 };
    const seeded: Partial<Record<RoomType, RoomYearDraft>> = {};
    for (const room of next.roomTypes) {
      seeded[room] = roomYearFromRates(room, year, ratesRef.current, fallback);
    }
    setSheets(seeded);
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

  async function submit() {
    setTouched(true);
    if (invalid) return;
    setSaving(true);
    try {
      const grouped = ratesByYear(sheets);
      if (grouped === null) {
        feedback.error(new Error("invalid monthly rates"), t("form.saveError"));
        return;
      }
      const monthlyRates = canPrice ? [...grouped.values()].flat() : [];
      const input = draftToInput(draft, hotel ?? undefined);
      const saved = hotel
        ? await repository.update(hotel.id, input)
        : await repository.create({ ...input, monthlyRates });
      if (hotel && canPrice) {
        for (const [year, rates] of grouped) {
          await repository.replaceMonthlyRates(saved.id, year, rates);
        }
      }
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

  return (
    <>
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
                className="h-12"
                value={draft.country}
                onChange={(e) => set("country", e.target.value)}
                maxLength={80}
                placeholder={t("form.location.countryPlaceholder")}
                data-testid="hotel-country"
              />
              <FieldError>{err("country")}</FieldError>
            </Field>
          </div>
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
              onChange={(v) => {
                const next = ROOM_TYPES.filter((r) => v.includes(r));
                const added = next.find((r) => !draft.roomTypes.includes(r));
                set("roomTypes", next);
                setSheets((s) => {
                  const keep: Partial<Record<RoomType, RoomYearDraft>> = {};
                  for (const r of next) if (s[r]) keep[r] = s[r];
                  return keep;
                });
                if (added && canPrice) {
                  const fallback = draftToInput(draft).markup;
                  setSheets((s) => ({ ...s, [added]: s[added] ?? emptyRoomYear(new Date().getFullYear(), fallback) }));
                  setPricingRoom(added);
                }
              }}
              options={ROOM_TYPES.map((r) => ({ value: r, label: t(`room.${r}`), icon: ROOM_LOOK[r].icon }))}
            />
            {draft.roomTypes.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {draft.roomTypes.map((r) => {
                  const look = ROOM_LOOK[r];
                  const Icon = look.icon;
                  const n = sheets[r] ? pricedMonthCount(sheets[r]!) : 0;
                  return (
                    <li key={r} className="flex items-center justify-between gap-3 rounded-2xl bg-indigo-50/70 px-3 py-2">
                      <span className="inline-flex min-w-0 items-center gap-2 text-[13px] font-semibold text-zinc-800">
                        <Icon className="h-4 w-4 text-indigo-500" aria-hidden />
                        {t(`room.${r}`)}
                        <span className="truncate text-[12px] font-medium text-zinc-500">{t("rates.pricedMonths", { n })}</span>
                      </span>
                      {canPrice ? (
                        <Button type="button" variant="outline" className="h-9 shrink-0" onClick={() => setPricingRoom(r)} data-testid={`hotel-room-prices-${r}`}>
                          {t("rates.editRoomPrices")}
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
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
          <div>
            <p className="mb-2 text-[12.5px] font-semibold text-zinc-600">{t("form.commercial.currency")}</p>
            <SegmentedControl
              aria-label={t("form.commercial.currency")}
              value={draft.currency}
              onChange={(v) => set("currency", v)}
              options={HOTEL_CURRENCIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="mb-2 text-[12.5px] font-semibold text-zinc-600">{t("rates.marginKind")}</p>
              <SegmentedControl
                aria-label={t("rates.marginKind")}
                value={draft.markupKind}
                onChange={(v) => set("markupKind", v)}
                options={[
                  { value: "percent", label: t("markup.percent"), icon: BadgePercent },
                  { value: "fixed", label: t("markup.fixed"), icon: Coins },
                ]}
              />
            </div>
            <div className="w-40">
              <p className="mb-2 text-[12.5px] font-semibold text-zinc-600">{t("rates.marginValue")}</p>
              <div className="relative">
                <Input
                  inputMode="decimal"
                  value={draft.markupValue}
                  onChange={(e) => set("markupValue", e.target.value.replace(/[^\d.,]/g, ""))}
                  className="h-11 pe-14 text-[15px] font-semibold tabular-nums"
                  data-testid="hotel-markup"
                  aria-label={t("rates.marginValue")}
                />
                <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 rounded-lg bg-zinc-100 px-2 py-1 text-[11px] font-bold text-zinc-500">
                  {draft.markupKind === "percent" ? "%" : draft.currency}
                </span>
              </div>
              <FieldError>{err("markupValue")}</FieldError>
            </div>
          </div>
          <p className="rounded-2xl bg-amber-50/70 px-4 py-3 text-[13px] text-amber-900" data-testid="hotel-markup-preview">
            {t("form.commercial.preview", {
              net: formatMoney(SAMPLE_NET, locale, draft.currency),
              gross: formatMoney(applyMarkup(SAMPLE_NET, draftToInput(draft).markup, 1), locale, draft.currency),
            })}
          </p>
          <div className="flex items-start gap-3 rounded-2xl bg-zinc-50 px-4 py-3 text-[13px] text-zinc-600" data-testid="hotel-rates-pointer">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden />
            <span>{t("form.commercial.ratesPointer")}</span>
          </div>
        </FormSection>

        <FormSection icon={NotebookPen} tone="zinc" title={t("form.notes.title")}>
          <Textarea value={draft.notes} onChange={(e) => set("notes", e.target.value)} maxLength={4000} rows={3} placeholder={t("form.notes.placeholder")} />
        </FormSection>
      </div>
    </ActionDialog>
    <RoomTypeRatesDialog
      key={pricingRoom ?? "closed"}
      open={canPrice && Boolean(pricingRoom)}
      room={pricingRoom}
      currency={draft.currency}
      fallback={draftToInput(draft).markup}
      value={pricingRoom ? (sheets[pricingRoom] ?? null) : null}
      onOpenChange={(next) => {
        if (!next) setPricingRoom(null);
      }}
      onDone={(room, yearDraft) => {
        setSheets((s) => ({ ...s, [room]: yearDraft }));
        setPricingRoom(null);
      }}
    />
    </>
  );
}
