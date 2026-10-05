"use client";

import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  BadgeCheck,
  BedDouble,
  BookUser,
  Building2,
  BusFront,
  Calculator,
  Camera,
  CalendarCheck2,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  Footprints,
  Gift,
  HeartPulse,
  Hotel,
  Info,
  ListChecks,
  MapPin,
  MapPinned,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  Receipt,
  Route,
  ShieldCheck,
  Stamp,
  Star,
  Syringe,
  Ticket,
  UserCheck,
  UserRound,
  UsersRound,
  Utensils,
  Waypoints,
  XCircle,
  Armchair,
} from "lucide-react";
import {
  AGE_TIERS,
  BOARD_LOOK,
  CITY_TONE,
  COST_LINES,
  INTERCITY_LOOK,
  KIT_LOOK,
  READINESS_CHECKS,
  ROOM_TIERS,
  TIER_LOOK,
  VISA_LOOK,
  ZIYARAT_LOOK,
  costTotal,
  lookOf,
  marginPct,
  stayNights,
  type Hotel as HotelSpec,
  type PricingTier,
  type ReadinessCheck,
  type TourPackage,
} from "@/entities/tourpackage";
import { EligibilityChecker, FX_TARGETS, usePackageFx } from "@/features/package-form";
import { cn } from "@/shared/lib/cn";
import { formatDay, formatMoney, formatMoneyWhole } from "@/shared/lib/format";
import { EmptyState, InfoRow, InfoSection, SegmentedControl, TONES, type Tone } from "@/shared/ui";

type TabProps = { pkg: TourPackage };

function useYesNo() {
  const t = useTranslations("packages.detail");
  return (v: boolean) => (v ? t("yes") : t("no"));
}

function Stars({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400" aria-label={`${n}★`}>
      {Array.from({ length: n }, (_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-current" strokeWidth={0} aria-hidden />
      ))}
    </span>
  );
}

function Chips({ items, tone }: { items: { key: string; label: string; icon?: typeof Star }[]; tone: Tone }) {
  const t = useTranslations("packages.detail");
  if (!items.length) return <p className="text-[13px] font-medium text-zinc-400">{t("none")}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ key, label, icon: Icon }) => (
        <span key={key} className={cn("inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold", TONES[tone].soft)}>
          {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
          {label}
        </span>
      ))}
    </div>
  );
}

function Rows({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-zinc-100">{children}</div>;
}

// ---------------------------------------------------------------- overview

export function OverviewTab({ pkg, checks, onJump }: TabProps & { checks: Record<ReadinessCheck, boolean>; onJump: (tab: string) => void }) {
  const t = useTranslations("packages");
  const yesNo = useYesNo();
  const s = pkg.spec;
  const missing = READINESS_CHECKS.filter((k) => !checks[k]);
  const jumpTo: Record<ReadinessCheck, string> = {
    makkahHotel: "hotels",
    madinahHotel: "hotels",
    flights: "logistics",
    visa: "services",
    pricing: "pricing",
    itinerary: "itinerary",
    costs: "pricing",
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-4">
        <InfoSection icon={Ticket} tone="indigo" title={t("steps.identity.title")} data-testid="package-overview-identity">
          {pkg.description ? <p className="mb-3 text-start text-[13.5px] leading-relaxed text-zinc-600" dir="auto">{pkg.description}</p> : null}
          <Rows>
            <InfoRow icon={lookOf(VISA_LOOK, s.visa.type).icon} tone="emerald" label={t("form.services.visa")} value={s.visa.type ? t(`visa.${s.visa.type}`) : t("detail.notSet")} muted={!s.visa.type} hint={s.visa.type ? `Nusuk · ${s.visa.type}` : undefined} />
            <InfoRow icon={UserRound} tone="indigo" label={t("detail.leader")} value={s.guidance.leaderName || t("detail.notSet")} muted={!s.guidance.leaderName} hint={s.guidance.femaleGuide ? t("form.services.femaleGuide") : undefined} />
            <InfoRow icon={HeartPulse} tone="rose" label={t("form.services.healthInsurance")} value={yesNo(s.visa.healthInsurance)} />
            <InfoRow icon={lookOf(INTERCITY_LOOK, s.transfers.intercity).icon} tone="sky" label={t("form.logistics.intercity")} value={s.transfers.intercity ? t(`intercity.${s.transfers.intercity}`) : t("detail.notSet")} muted={!s.transfers.intercity} />
          </Rows>
        </InfoSection>
        <IncludedCard pkg={pkg} />
      </div>
      <InfoSection
        icon={ClipboardCheck}
        tone={missing.length ? "amber" : "emerald"}
        title={t("readiness.title")}
        badge={<span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-600">{READINESS_CHECKS.length - missing.length}/{READINESS_CHECKS.length}</span>}
        data-testid="package-overview-readiness"
      >
        <ul className="space-y-1.5">
          {READINESS_CHECKS.map((k) => (
            <li key={k}>
              <button
                type="button"
                onClick={() => onJump(jumpTo[k])}
                className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-start transition hover:bg-zinc-50"
              >
                {checks[k] ? <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden /> : <CircleDashed className="h-5 w-5 text-amber-500" aria-hidden />}
                <span className={cn("flex-1 text-[13.5px] font-semibold", checks[k] ? "text-zinc-800" : "text-zinc-500")}>{t(`readiness.${k}`)}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className={cn("mt-3 rounded-2xl px-3 py-2.5 text-[12.5px] font-semibold", missing.length ? TONES.amber.soft : TONES.emerald.soft)}>
          {missing.length ? t("detail.incomplete", { items: missing.map((k) => t(`readiness.${k}`)).join(", ") }) : t("detail.complete")}
        </p>
      </InfoSection>
    </div>
  );
}

function IncludedCard({ pkg }: TabProps) {
  const t = useTranslations("packages");
  const { included, excluded } = pkg.spec;
  if (!included.length && !excluded.length) return null;
  return (
    <InfoSection icon={ListChecks} tone="teal" title={t("form.services.lines")}>
      <div className="grid gap-4 sm:grid-cols-2">
        {([
          ["included", included, CheckCircle2, "text-emerald-500"],
          ["excluded", excluded, XCircle, "text-rose-400"],
        ] as const).map(([key, lines, Icon, cls]) => (
          <div key={key}>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-zinc-400">{t(`form.services.${key}`)}</p>
            <ul className="space-y-1.5">
              {lines.map((l, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-zinc-700" dir="auto">
                  <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", cls)} aria-hidden />
                  {l}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </InfoSection>
  );
}

// ---------------------------------------------------------------- hotels

export function HotelsTab({ pkg }: TabProps) {
  const t = useTranslations("packages");
  const s = pkg.spec;
  const cities = s.nights.madinah > 0 || s.madinah.name ? (["makkah", "madinah"] as const) : (["makkah"] as const);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {cities.map((city) => (
        <HotelCard key={city} city={city} hotel={s[city]} nights={s.nights[city]} />
      ))}
      {s.nights.madinah === 0 && !s.madinah.name ? (
        <div className="flex items-center gap-3 rounded-[26px] border border-dashed border-zinc-200 p-5 text-[13px] font-medium text-zinc-500">
          <Building2 className="h-6 w-6 text-zinc-300" aria-hidden />
          {t("form.hotels.noMadinah")}
        </div>
      ) : null}
    </div>
  );
}

function HotelCard({ city, hotel, nights }: { city: "makkah" | "madinah"; hotel: HotelSpec; nights: number }) {
  const t = useTranslations("packages");
  const locale = useLocale();
  const tone: Tone = city === "makkah" ? "emerald" : "sky";
  const fromDates = stayNights(hotel);
  return (
    <section className="overflow-hidden rounded-[26px] border border-zinc-200/60 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]" data-testid={`package-hotel-${city}`}>
      <div className={cn("flex items-center gap-4 bg-gradient-to-br p-5", TONES[tone].tint)}>
        <span className={cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px]", TONES[tone].gradient)} aria-hidden>
          {city === "makkah" ? <Hotel className="h-8 w-8" /> : <Building2 className="h-8 w-8" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500">{t(`form.hotels.${city}`)}</p>
          <h3 className={cn("truncate text-start text-[18px] font-semibold tracking-tight", hotel.name ? "text-zinc-950" : "text-zinc-400")}>
            <bdi>{hotel.name || t("detail.noHotel")}</bdi>
          </h3>
          <Stars n={hotel.stars} />
        </div>
        <div className="text-end">
          <p className="text-[26px] font-bold leading-none tabular-nums text-zinc-950">{nights}</p>
          <p className="text-[11.5px] font-medium text-zinc-500">{t("form.hotels.nights")}</p>
        </div>
      </div>
      <div className="p-5 pt-3">
        <Rows>
          <InfoRow
            icon={hotel.access === "shuttle" ? BusFront : Footprints}
            tone="amber"
            label={t("form.hotels.distance")}
            value={hotel.distanceM > 0 ? t("detail.distanceM", { n: hotel.distanceM }) : t("detail.notSet")}
            muted={!hotel.distanceM}
            hint={
              hotel.access === "shuttle" && hotel.shuttleMinutes > 0
                ? t("detail.shuttle", { n: hotel.shuttleMinutes })
                : hotel.access
                  ? t(`access.${hotel.access}`)
                  : undefined
            }
          />
          <InfoRow
            icon={hotel.board ? lookOf(BOARD_LOOK, hotel.board).icon : Utensils}
            tone="rose"
            label={t("form.hotels.board")}
            value={hotel.board ? `${t(`board.${hotel.board}`)} · ${t(`boardShort.${hotel.board}`)}` : t("detail.notSet")}
            muted={!hotel.board}
          />
          {city === "madinah" ? (
            <InfoRow icon={MapPin} tone="violet" label={t("form.hotels.zone")} value={hotel.zone ? t(`zone.${hotel.zone}`) : t("detail.notSet")} muted={!hotel.zone} />
          ) : null}
          <InfoRow
            icon={CalendarCheck2}
            tone="sky"
            label={t("detail.stay")}
            value={hotel.checkIn && hotel.checkOut ? `${formatDay(hotel.checkIn, locale)} → ${formatDay(hotel.checkOut, locale)}` : t("detail.notSet")}
            muted={!hotel.checkIn}
            hint={fromDates ? t("card.nights", { n: fromDates }) : undefined}
          />
        </Rows>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- pricing

export function PricingTab({ pkg, tiers, action }: TabProps & { tiers: PricingTier[]; action?: ReactNode }) {
  const t = useTranslations("packages");
  const locale = useLocale();
  const fx = usePackageFx();
  const base = pkg.baseCurrency;
  const [show, setShow] = useState<string>(base);
  const options = Array.from(new Set([base, ...FX_TARGETS]));
  const net = costTotal(pkg.spec.costs);
  const known = new Set<string>([...ROOM_TIERS.map((r) => r.code), ...AGE_TIERS.map((a) => a.code)]);
  const ordered = [
    ...ROOM_TIERS.map((r) => tiers.find((x) => x.code === r.code)),
    ...AGE_TIERS.map((a) => tiers.find((x) => x.code === a.code)),
    ...tiers.filter((x) => !known.has(x.code)),
  ].filter((x): x is PricingTier => Boolean(x && x.isActive && x.amount > 0));

  const display = (amount: number, currency: string) => {
    const v = fx.convert(amount, currency, show);
    return v === null ? formatMoney(amount, locale, currency) : formatMoney(v, locale, show);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <InfoSection
        icon={Receipt}
        tone="emerald"
        title={t("detail.priceTable")}
        data-testid="package-pricing-matrix"
        action={
          <div className="flex items-center gap-2">
            {action}
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12px] font-semibold text-zinc-500">{t("detail.convertTo")}</span>
          <SegmentedControl value={show} onChange={setShow} options={options.map((c) => ({ value: c, label: c }))} aria-label={t("detail.convertTo")} />
        </div>
        {ordered.length === 0 ? (
          <EmptyState icon={Receipt} title={t("detail.noPrices")} description={t("detail.noPricesHint")} />
        ) : (
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-[20px] bg-zinc-50/70 ring-1 ring-inset ring-zinc-900/[0.04]">
            {ordered.map((tier) => {
              const Icon = TIER_LOOK[tier.code] ?? BedDouble;
              const m = tier.kind !== "age" ? marginPct(fx.convert(tier.amount, tier.currency, pkg.spec.costs.currency) ?? 0, net) : null;
              return (
                <li key={tier.id} className="flex items-center gap-3 p-3" data-testid={`package-price-${tier.code}`}>
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]", tier.kind === "age" ? TONES.sky.soft : TONES.emerald.soft)} aria-hidden>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-zinc-900">{known.has(tier.code) ? t(`tier.${tier.code}`) : tier.label}</span>
                    <span className="block truncate text-[11.5px] font-medium text-zinc-500">{known.has(tier.code) ? t(`tierHint.${tier.code}`) : tier.code}</span>
                  </span>
                  <span className="text-end">
                    <span className="block text-[15px] font-bold tabular-nums text-zinc-950">{display(tier.amount, tier.currency)}</span>
                    {show !== tier.currency ? (
                      <span className="block text-[11px] font-medium tabular-nums text-zinc-400">{formatMoney(tier.amount, locale, tier.currency)}</span>
                    ) : m !== null ? (
                      <span className={cn("block text-[11px] font-semibold", m < 0 ? "text-rose-600" : "text-emerald-600")}>{t("form.pricing.margin")} {m}%</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {!fx.ready && show !== base ? <p className="mt-2 text-[11.5px] text-zinc-400">{t("form.pricing.fxUnavailable")}</p> : null}
      </InfoSection>

      <CostCard pkg={pkg} />
    </div>
  );
}

function CostCard({ pkg }: TabProps) {
  const t = useTranslations("packages");
  const locale = useLocale();
  const c = pkg.spec.costs;
  const net = costTotal(c);
  const currency = c.currency || pkg.baseCurrency;
  const tones: Tone[] = ["sky", "emerald", "violet", "amber", "indigo", "rose"];
  return (
    <InfoSection icon={Calculator} tone="amber" title={t("form.pricing.costs")} data-testid="package-pricing-costs">
      {net === 0 ? (
        <p className="text-[13px] font-medium text-zinc-400">{t("detail.notSet")}</p>
      ) : (
        <>
          <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-zinc-100" aria-hidden>
            {COST_LINES.map((l, i) => (c[l] > 0 ? <span key={l} className={TONES[tones[i]].dot} style={{ width: `${(c[l] / net) * 100}%` }} /> : null))}
          </div>
          <ul className="space-y-2">
            {COST_LINES.map((l, i) =>
              c[l] > 0 ? (
                <li key={l} className="flex items-center gap-2.5 text-[13px]">
                  <span className={cn("h-2.5 w-2.5 rounded-full", TONES[tones[i]].dot)} aria-hidden />
                  <span className="flex-1 font-medium text-zinc-700">{t(`cost.${l}`)}</span>
                  <span className="text-[11.5px] text-zinc-400">{t("detail.costShare", { pct: Math.round((c[l] / net) * 100) })}</span>
                  <span className="w-28 text-end font-semibold tabular-nums text-zinc-900">{formatMoney(c[l], locale, currency)}</span>
                </li>
              ) : null,
            )}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-[18px] bg-zinc-50 p-3">
              <p className="text-[11.5px] font-semibold text-zinc-500">{t("form.pricing.total")}</p>
              <p className="mt-1 text-[17px] font-bold tabular-nums text-zinc-900">{formatMoney(net, locale, currency)}</p>
            </div>
            <div className="rounded-[18px] bg-emerald-50/80 p-3">
              <p className="text-[11.5px] font-semibold text-zinc-500">
                {t("form.pricing.suggested")} · +{c.markupPct}%
              </p>
              <p className="mt-1 text-[17px] font-bold tabular-nums text-emerald-700">{formatMoneyWhole(pkg.stats.suggestedPrice, locale, currency)}</p>
            </div>
          </div>
        </>
      )}
    </InfoSection>
  );
}

// ---------------------------------------------------------------- logistics

export function LogisticsTab({ pkg }: TabProps) {
  const t = useTranslations("packages");
  const yesNo = useYesNo();
  const s = pkg.spec;
  const f = s.flights;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {pkg.transportMode === "road" ? (
        <div className={cn("flex items-center gap-3 rounded-[26px] p-5 text-[13.5px] font-semibold", TONES.amber.soft)}>
          <BusFront className="h-7 w-7" aria-hidden />
          {t("form.logistics.road")}
        </div>
      ) : (
        <InfoSection icon={Plane} tone="sky" title={t("form.logistics.flights")} badge={f.routing ? <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">{t(`routing.${f.routing}`)}</span> : null} data-testid="package-logistics-flights">
          <p className="mb-3 text-[17px] font-semibold text-zinc-950">{f.airline || <span className="text-zinc-400">{t("detail.notSet")}</span>}</p>
          <div className="space-y-2.5">
            <LegCard icon={PlaneTakeoff} tone="sky" label={t("form.logistics.outbound")} leg={f.outbound} />
            <LegCard icon={PlaneLanding} tone="indigo" label={t("form.logistics.inbound")} leg={f.inbound} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div className="rounded-[18px] bg-violet-50/70 p-3">
              <p className="text-[11.5px] font-semibold text-zinc-500">{t("form.logistics.pnr")}</p>
              <p dir="ltr" className="mt-1 text-start text-[16px] font-bold tracking-[0.2em] text-zinc-900">{f.pnr || "—"}</p>
            </div>
            <div className="rounded-[18px] bg-sky-50/70 p-3">
              <p className="flex items-center gap-1 text-[11.5px] font-semibold text-zinc-500">
                <Armchair className="h-3.5 w-3.5" aria-hidden />
                {t("form.logistics.blockSeats")}
              </p>
              <p className="mt-1 text-[16px] font-bold tabular-nums text-zinc-900">{f.blockSeats || "—"}</p>
            </div>
          </div>
        </InfoSection>
      )}
      <InfoSection icon={Waypoints} tone="emerald" title={t("form.logistics.ground")} data-testid="package-logistics-ground">
        <Rows>
          <InfoRow
            icon={lookOf(INTERCITY_LOOK, s.transfers.intercity).icon}
            tone="emerald"
            label={t("form.logistics.intercity")}
            value={s.transfers.intercity ? t(`intercity.${s.transfers.intercity}`) : t("detail.notSet")}
            muted={!s.transfers.intercity}
            hint={s.transfers.busClass || undefined}
          />
          <InfoRow icon={UserCheck} tone="sky" label={t("form.logistics.airportMeet")} value={yesNo(s.transfers.airportMeet)} muted={!s.transfers.airportMeet} />
          <InfoRow icon={Hotel} tone="violet" label={t("form.logistics.hotelTransfers")} value={yesNo(s.transfers.hotelTransfers)} muted={!s.transfers.hotelTransfers} />
        </Rows>
      </InfoSection>
    </div>
  );
}

function LegCard({ icon: Icon, tone, label, leg }: { icon: typeof Plane; tone: Tone; label: string; leg: TourPackage["spec"]["flights"]["outbound"] }) {
  const t = useTranslations("packages");
  const locale = useLocale();
  const [from, ...rest] = leg.route ? leg.route.split("-") : [];
  const to = rest.at(-1);
  const via = rest.slice(0, -1);
  return (
    <div className="flex items-center gap-3 rounded-[20px] bg-zinc-50/80 p-3 ring-1 ring-inset ring-zinc-900/[0.04]">
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]", TONES[tone].soft)} aria-hidden>
        <Icon className="h-5 w-5 rtl:-scale-x-100" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-semibold text-zinc-500">{label}</p>
        {leg.route ? (
          <p dir="ltr" className="flex items-center gap-2 text-start text-[17px] font-bold tracking-wide text-zinc-950">
            {from}
            <span className="h-px w-6 bg-zinc-300" aria-hidden />
            {via.length ? <span className="text-[11px] font-semibold text-zinc-400">{via.join(" · ")}</span> : null}
            {via.length ? <span className="h-px w-6 bg-zinc-300" aria-hidden /> : null}
            {to}
          </p>
        ) : (
          <p className="text-[14px] font-semibold text-zinc-400">{t("detail.notSet")}</p>
        )}
      </div>
      <div className="text-end text-[12px] font-semibold text-zinc-600">
        {leg.flightNo ? <p dir="ltr">{leg.flightNo}</p> : null}
        {leg.date ? <p className="text-zinc-400">{formatDay(leg.date, locale)}</p> : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- services

export function ServicesTab({ pkg }: TabProps) {
  const t = useTranslations("packages");
  const yesNo = useYesNo();
  const s = pkg.spec;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <InfoSection icon={UserRound} tone="indigo" title={t("form.services.guidance")}>
        <Rows>
          <InfoRow icon={UserRound} tone="indigo" label={t("form.services.leader")} value={s.guidance.leaderName || t("detail.notSet")} muted={!s.guidance.leaderName} />
          <InfoRow icon={UsersRound} tone="rose" label={t("form.services.femaleGuide")} value={yesNo(s.guidance.femaleGuide)} muted={!s.guidance.femaleGuide} />
        </Rows>
      </InfoSection>
      <InfoSection icon={Stamp} tone="emerald" title={t("form.services.visa")}>
        <Rows>
          <InfoRow icon={lookOf(VISA_LOOK, s.visa.type).icon} tone="emerald" label={t("form.services.visa")} value={s.visa.type ? t(`visa.${s.visa.type}`) : t("detail.notSet")} hint={s.visa.type || undefined} muted={!s.visa.type} />
          <InfoRow icon={HeartPulse} tone="rose" label={t("form.services.healthInsurance")} value={yesNo(s.visa.healthInsurance)} muted={!s.visa.healthInsurance} />
        </Rows>
      </InfoSection>
      <InfoSection icon={Gift} tone="amber" title={t("form.services.kit")}>
        <Chips tone="amber" items={s.kit.map((k) => ({ key: k, label: t(`kit.${k}`), icon: KIT_LOOK[k] }))} />
      </InfoSection>
      <InfoSection icon={MapPinned} tone="violet" title={`${t("form.services.ziyaratMakkah")} · ${t("form.services.ziyaratMadinah")}`}>
        <div className="space-y-3">
          <Chips tone="emerald" items={s.ziyarat.makkah.map((z) => ({ key: z, label: t(`ziyarat.${z}`), icon: ZIYARAT_LOOK[z] }))} />
          <Chips tone="sky" items={s.ziyarat.madinah.map((z) => ({ key: z, label: t(`ziyarat.${z}`), icon: ZIYARAT_LOOK[z] }))} />
        </div>
      </InfoSection>
    </div>
  );
}

// ---------------------------------------------------------------- itinerary

export function ItineraryTab({ pkg }: TabProps) {
  const t = useTranslations("packages");
  const days = pkg.spec.itinerary;
  if (!days.length) return <EmptyState icon={Route} title={t("detail.noItinerary")} description={t("detail.noItineraryHint")} />;
  return (
    <InfoSection icon={Route} tone="violet" title={t("form.itinerary.title")} badge={<span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-600">{days.length}/{pkg.durationDays}</span>}>
      <ol className="relative space-y-3 before:absolute before:inset-y-3 before:start-[23px] before:w-0.5 before:rounded-full before:bg-zinc-100" data-testid="package-itinerary">
        {days.map((d) => {
          const tone = CITY_TONE[d.city] ?? "zinc";
          return (
            <li key={d.day} className="relative flex gap-3.5">
              <span className={cn("relative z-[1] flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[16px] ring-4 ring-white", TONES[tone].gradient)}>
                <span className="text-[9px] font-semibold uppercase leading-none opacity-80">{t("form.itinerary.day")}</span>
                <span className="text-[17px] font-bold leading-tight tabular-nums">{d.day}</span>
              </span>
              <div className="min-w-0 flex-1 rounded-[20px] bg-zinc-50/80 p-3 ring-1 ring-inset ring-zinc-900/[0.04]">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-start text-[14px] font-semibold text-zinc-900" dir="auto">{d.title}</p>
                  {d.city ? <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", TONES[tone].soft)}>{t(`city.${d.city}`)}</span> : null}
                </div>
                {d.details ? <p className="mt-1 text-start text-[12.5px] leading-relaxed text-zinc-500" dir="auto">{d.details}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </InfoSection>
  );
}

// ---------------------------------------------------------------- requirements

export function RequirementsTab({ pkg }: TabProps) {
  const t = useTranslations("packages");
  const r = pkg.spec.requirements;
  const rows: { icon: typeof Star; tone: Tone; label: string; on: boolean; hint: string }[] = [
    { icon: BookUser, tone: "violet", label: t("form.requirements.passport"), on: r.passportMonths > 0, hint: `${r.passportMonths} ${t("form.requirements.months")}` },
    { icon: Syringe, tone: "emerald", label: t("form.requirements.meningitis"), on: r.meningitis, hint: t("form.requirements.meningitisHint") },
    { icon: Camera, tone: "sky", label: t("form.requirements.photo"), on: r.biometricPhoto, hint: t("form.requirements.photoHint") },
    {
      icon: UsersRound,
      tone: "amber",
      label: t("form.requirements.mahram"),
      on: r.mahram,
      hint: r.mahram && r.mahramMaxAge ? `< ${r.mahramMaxAge} ${t("form.requirements.years")}` : t("form.requirements.mahramHint"),
    },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <InfoSection icon={ShieldCheck} tone="rose" title={t("form.requirements.title")} data-testid="package-requirements">
        <ul className="space-y-2">
          {rows.map(({ icon: Icon, tone, label, on, hint }) => (
            <li key={label} className="flex items-center gap-3 rounded-[18px] bg-zinc-50/80 p-3 ring-1 ring-inset ring-zinc-900/[0.04]">
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]", on ? TONES[tone].solid : TONES.zinc.soft)} aria-hidden>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold text-zinc-900">{label}</span>
                <span className="block text-[11.5px] font-medium text-zinc-500">{hint}</span>
              </span>
              {on ? <BadgeCheck className="h-5 w-5 text-emerald-500" aria-hidden /> : <Info className="h-5 w-5 text-zinc-300" aria-hidden />}
            </li>
          ))}
        </ul>
      </InfoSection>
      <InfoSection icon={UserCheck} tone="indigo" title={t("form.requirements.checker")}>
        <EligibilityChecker requirements={r} defaultDepartDate={pkg.stats.nextDepartDate ?? pkg.spec.flights.outbound.date} />
      </InfoSection>
    </div>
  );
}
