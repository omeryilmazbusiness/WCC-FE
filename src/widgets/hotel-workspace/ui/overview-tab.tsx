"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  BadgePercent,
  BedDouble,
  Coins,
  Globe2,
  Mail,
  MapPin,
  MapPinned,
  Navigation,
  NotebookPen,
  Phone,
  Send,
  UserRound,
  UtensilsCrossed,
} from "lucide-react";
import { LANDMARK_LOOK, MEAL_LOOK, MEAL_PLANS, ROOM_LOOK, ROOM_TYPES, mapsUrl, type Hotel } from "@/entities/hotel";
import { cn } from "@/shared/lib/cn";
import { formatMoney } from "@/shared/lib/format";
import { CopyButton, InfoRow, InfoSection, TONES, infoActionClass } from "@/shared/ui";

export function OverviewTab({ hotel }: { hotel: Hotel }) {
  const t = useTranslations("hotels");
  const locale = useLocale();
  const { location: l, contact: c } = hotel;
  const landmark = l.landmark ? LANDMARK_LOOK[l.landmark] : null;
  const none = <span className="text-zinc-400">{t("overview.notSet")}</span>;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <InfoSection icon={MapPinned} tone="emerald" title={t("overview.location")} data-testid="hotel-location">
        <div className="divide-y divide-zinc-100">
          <InfoRow icon={MapPin} tone="emerald" label={t("form.location.city")} value={[l.district, l.city].filter(Boolean).join(" · ") || none} />
          <InfoRow icon={Globe2} tone="sky" label={t("form.location.country")} value={l.country || none} />
          {landmark ? (
            <InfoRow
              icon={landmark.icon}
              tone={landmark.tone}
              label={t("form.location.landmark")}
              value={l.distanceM > 0 ? t("distanceTo", { m: l.distanceM, place: t(`landmark.${l.landmark}`) }) : t(`landmark.${l.landmark}`)}
            />
          ) : null}
          <InfoRow
            icon={Navigation}
            tone="indigo"
            label={t("overview.coordinates")}
            dir="ltr"
            value={l.latitude != null && l.longitude != null ? `${l.latitude}, ${l.longitude}` : none}
            action={
              <a href={mapsUrl(hotel)} target="_blank" rel="noreferrer" className={infoActionClass} data-testid="hotel-maps">
                {t("overview.openMap")}
              </a>
            }
          />
        </div>
      </InfoSection>

      <InfoSection icon={UserRound} tone="violet" title={t("overview.contact")} data-testid="hotel-contact">
        <div className="divide-y divide-zinc-100">
          <InfoRow icon={UserRound} tone="violet" label={t("form.contact.salesName")} value={c.salesName || none} />
          <InfoRow
            icon={Phone}
            tone="emerald"
            label={t("form.contact.salesPhone")}
            dir="ltr"
            value={c.salesPhone ? <a href={`tel:${c.salesPhone.replace(/[^\d+]/g, "")}`} className="hover:underline">{c.salesPhone}</a> : none}
          />
          <InfoRow
            icon={Mail}
            tone="sky"
            label={t("form.contact.salesEmail")}
            dir="ltr"
            value={c.salesEmail ? <a href={`mailto:${c.salesEmail}`} className="hover:underline">{c.salesEmail}</a> : none}
          />
          <InfoRow
            icon={Send}
            tone="amber"
            label={t("form.contact.reservationsEmail")}
            dir="ltr"
            hint={t("form.contact.reservationsHint")}
            value={c.reservationsEmail || none}
            action={c.reservationsEmail ? <CopyButton value={c.reservationsEmail} label={t("overview.copyEmail")} /> : undefined}
          />
        </div>
      </InfoSection>

      <InfoSection icon={BedDouble} tone="indigo" title={t("overview.offer")} data-testid="hotel-offer">
        <p className="mb-2 text-[12px] font-semibold text-zinc-500">{t("form.offer.roomTypes")}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ROOM_TYPES.filter((r) => hotel.roomTypes.includes(r)).map((r) => {
            const look = ROOM_LOOK[r];
            const Icon = look.icon;
            return (
              <div key={r} className={cn("flex items-center gap-2.5 rounded-[18px] bg-gradient-to-br p-2.5 ring-1 ring-inset ring-zinc-900/[0.04]", TONES[look.tone].tint)}>
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]", TONES[look.tone].solid)} aria-hidden>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="truncate text-[13px] font-semibold text-zinc-800">{t(`room.${r}`)}</span>
              </div>
            );
          })}
        </div>
        <p className="mb-2 mt-4 flex items-center gap-1.5 text-[12px] font-semibold text-zinc-500">
          <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden />
          {t("form.offer.mealPlans")}
        </p>
        <div className="flex flex-wrap gap-2">
          {MEAL_PLANS.filter((m) => hotel.mealPlans.includes(m)).map((m) => {
            const look = MEAL_LOOK[m];
            const Icon = look.icon;
            return (
              <span key={m} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold", TONES[look.tone].soft)}>
                <Icon className="h-4 w-4" aria-hidden />
                {t(`meal.${m}.short`)} · {t(`meal.${m}.label`)}
              </span>
            );
          })}
        </div>
      </InfoSection>

      <InfoSection icon={Coins} tone="amber" title={t("overview.commercial")} data-testid="hotel-commercial">
        <div className="divide-y divide-zinc-100">
          <InfoRow icon={Coins} tone="amber" label={t("form.commercial.currency")} value={hotel.currency} />
          <InfoRow
            icon={BadgePercent}
            tone="emerald"
            label={t("overview.markup")}
            value={
              hotel.markup.kind === "percent"
                ? `${hotel.markup.value / 100}%`
                : t("overview.fixedMarkup", { amount: formatMoney(hotel.markup.value, locale, hotel.currency) })
            }
            hint={t("overview.markupHint")}
          />
          {hotel.notes ? <InfoRow icon={NotebookPen} tone="zinc" label={t("form.notes.title")} value={<span className="whitespace-pre-wrap">{hotel.notes}</span>} /> : null}
        </div>
      </InfoSection>
    </div>
  );
}
