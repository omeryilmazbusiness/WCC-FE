"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Baby,
  BedDouble,
  BedSingle,
  Calculator,
  CalendarCheck2,
  CalendarRange,
  ClipboardCopy,
  Plus,
  ShieldAlert,
  Trash2,
  TrendingUp,
  UsersRound,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import {
  AVAILABILITY_LOOK,
  MEAL_LOOK,
  MEAL_PLANS,
  ROOM_LOOK,
  ROOM_TYPES,
  SEASON_LOOK,
  daysBetween,
  type Hotel,
  type HotelRepository,
  type Quote,
  type QuoteRequest,
  type Season,
} from "@/entities/hotel";
import { cn } from "@/shared/lib/cn";
import { formatDay, formatMoney } from "@/shared/lib/format";
import { Button, ChipSet, Field, FormSection, IconButton, Input, Stepper, SwitchRow, TONES, useDescribeError, useToast } from "@/shared/ui";
import {
  MAX_CHILD_AGE,
  MAX_QUOTE_ROOMS,
  MAX_ROOM_ADULTS,
  MAX_ROOM_CHILDREN,
  defaultQuoteRequest,
  quoteFormError,
} from "../model/quote-form";
import { VoucherPanel } from "./voucher-panel";

type Props = {
  repository: HotelRepository;
  hotel: Hotel;
  seasons: readonly Season[];
  today: string;
};

const DEBOUNCE_MS = 350;

/** Live stay pricing from the contract: net, gross with markup, availability and cancellation outlook. */
export function QuoteCalculator({ repository, hotel, seasons, today }: Props) {
  const t = useTranslations("hotels");
  const locale = useLocale();
  const { push } = useToast();
  const describe = useDescribeError();
  const [req, setReq] = useState<QuoteRequest>(() => defaultQuoteRequest(hotel, today, seasons));
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const callId = useRef(0);

  const formError = quoteFormError(req, hotel);
  const set = <K extends keyof QuoteRequest>(k: K, v: QuoteRequest[K]) => setReq((r) => ({ ...r, [k]: v }));
  const money = (minor: number) => formatMoney(minor, locale, hotel.currency);

  useEffect(() => {
    if (formError || !hotel.isActive) {
      callId.current += 1;
      setQuote(null);
      setLoading(false);
      return;
    }
    const id = ++callId.current;
    setLoading(true);
    const timer = window.setTimeout(() => {
      repository
        .quote(hotel.id, req)
        .then((q) => {
          if (id !== callId.current) return;
          setQuote(q);
          setError(null);
        })
        .catch((e) => {
          if (id !== callId.current) return;
          setQuote(null);
          const d = describe(e);
          setError(d.description ?? d.title);
        })
        .finally(() => {
          if (id === callId.current) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [repository, hotel, req, formError, describe]);

  const nights = req.checkIn && req.checkOut ? Math.max(0, daysBetween(req.checkIn, req.checkOut)) : 0;
  const availability = quote ? AVAILABILITY_LOOK[quote.availability] : null;
  const AvailIcon = availability?.icon;

  const summary = useMemo(() => {
    if (!quote) return "";
    const lines = [
      `${hotel.name}${hotel.stars ? ` ${"★".repeat(hotel.stars)}` : ""}`,
      `${t("quote.text.stay")}: ${formatDay(quote.checkIn, locale)} → ${formatDay(quote.checkOut, locale)} (${t("season.nights", { n: quote.nights })})`,
      `${t("quote.text.room")}: ${quote.rooms} × ${t(`room.${quote.roomType}`)} · ${t(`meal.${quote.mealPlan}.label`)}`,
      `${t("quote.text.guests")}: ${t("quote.guestsLine", { adults: quote.adults, children: quote.children.length })}`,
      `${t("quote.total")}: ${formatMoney(quote.grossTotal, locale, hotel.currency)}`,
      quote.cancellation.freeUntil ? `${t("quote.freeUntil")}: ${formatDay(quote.cancellation.freeUntil, locale)}` : "",
    ];
    return lines.filter(Boolean).join("\n");
  }, [quote, hotel, locale, t]);

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      push({ title: t("quote.copied"), tone: "success" });
    } catch {
      push({ title: t("quote.copyFailed"), tone: "error" });
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]" data-testid="hotel-quote">
      <div className="space-y-4">
        <FormSection icon={CalendarRange} tone="sky" title={t("quote.stay")} hint={nights ? t("season.nights", { n: nights }) : undefined}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("quote.checkIn")} htmlFor="quote-in">
              <Input id="quote-in" type="date" className="h-12" value={req.checkIn} onChange={(e) => set("checkIn", e.target.value)} data-testid="quote-check-in" />
            </Field>
            <Field label={t("quote.checkOut")} htmlFor="quote-out">
              <Input id="quote-out" type="date" className="h-12" min={req.checkIn || undefined} value={req.checkOut} onChange={(e) => set("checkOut", e.target.value)} data-testid="quote-check-out" />
            </Field>
          </div>
        </FormSection>

        <FormSection icon={BedDouble} tone="indigo" title={t("quote.roomAndBoard")}>
          <ChipSet
            name="quote-room"
            tone="indigo"
            values={[req.roomType]}
            onChange={(v) => {
              const next = v.find((x) => x !== req.roomType);
              if (next) set("roomType", next as QuoteRequest["roomType"]);
            }}
            options={ROOM_TYPES.filter((r) => hotel.roomTypes.includes(r)).map((r) => ({ value: r, label: t(`room.${r}`), icon: ROOM_LOOK[r].icon }))}
          />
          <ChipSet
            name="quote-meal"
            tone="amber"
            values={[req.mealPlan]}
            onChange={(v) => {
              const next = v.find((x) => x !== req.mealPlan);
              if (next) set("mealPlan", next as QuoteRequest["mealPlan"]);
            }}
            options={MEAL_PLANS.filter((m) => hotel.mealPlans.includes(m)).map((m) => ({ value: m, label: t(`meal.${m}.label`), icon: MEAL_LOOK[m].icon }))}
          />
        </FormSection>

        <FormSection icon={UsersRound} tone="emerald" title={t("quote.guests")} hint={t("quote.perRoom")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[12.5px] font-semibold text-zinc-600">{t("quote.rooms")}</p>
              <Stepper value={req.rooms} min={1} max={MAX_QUOTE_ROOMS} onChange={(v) => set("rooms", v)} label={t("quote.rooms")} testId="quote-rooms" />
            </div>
            <div>
              <p className="mb-1.5 text-[12.5px] font-semibold text-zinc-600">{t("quote.adults")}</p>
              <Stepper value={req.adults} min={1} max={MAX_ROOM_ADULTS} onChange={(v) => set("adults", v)} label={t("quote.adults")} testId="quote-adults" />
            </div>
          </div>
          <div className="space-y-2">
            {req.children.map((c, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2.5 rounded-[18px] bg-zinc-50/80 p-2.5 ring-1 ring-inset ring-zinc-900/[0.04]">
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]", TONES.rose.soft)} aria-hidden>
                  <Baby className="h-5 w-5" />
                </span>
                <div className="w-44">
                  <Stepper
                    value={c.age}
                    min={0}
                    max={MAX_CHILD_AGE}
                    suffix={t("policy.child.years")}
                    label={t("quote.childAge", { n: i + 1 })}
                    onChange={(age) => set("children", req.children.map((x, j) => (j === i ? { ...x, age } : x)))}
                  />
                </div>
                <button
                  type="button"
                  aria-pressed={c.bed}
                  onClick={() => set("children", req.children.map((x, j) => (j === i ? { ...x, bed: !x.bed } : x)))}
                  className={cn(
                    "inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold transition",
                    c.bed ? cn("border-transparent", TONES.sky.solid) : "border-zinc-200 bg-white text-zinc-600",
                  )}
                >
                  <BedSingle className="h-4 w-4" aria-hidden />
                  {c.bed ? t("quote.withBed") : t("quote.noBed")}
                </button>
                <IconButton label={t("quote.removeChild")} variant="ghost" className="ms-auto text-rose-600" onClick={() => set("children", req.children.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            ))}
            {req.children.length < MAX_ROOM_CHILDREN ? (
              <Button variant="outline" size="sm" onClick={() => set("children", [...req.children, { age: 5, bed: false }])} data-testid="quote-add-child">
                <Plus className="h-4 w-4" aria-hidden />
                {t("quote.addChild")}
              </Button>
            ) : null}
          </div>
          <SwitchRow
            icon={BedSingle}
            tone="teal"
            label={t("quote.extraBed")}
            hint={hotel.childPolicy.extraBedAdult ? money(hotel.childPolicy.extraBedAdult) : t("quote.extraBedNoPrice")}
            checked={req.extraBed}
            onChange={(v) => set("extraBed", v)}
          />
        </FormSection>
      </div>

      <div className="space-y-4">
        <section
          className={cn(
            "overflow-hidden rounded-[28px] border border-zinc-200/60 bg-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] transition-opacity",
            loading && "opacity-70",
          )}
          aria-busy={loading}
          data-testid="quote-result"
        >
          <div className={cn("bg-gradient-to-br p-5", TONES[availability?.tone ?? "indigo"].tint)}>
            <div className="flex items-start gap-3.5">
              <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px]", TONES[availability?.tone ?? "indigo"].gradient)} aria-hidden>
                <Calculator className="h-7 w-7" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500">{t("quote.total")}</p>
                <p className="text-[30px] font-bold leading-tight tabular-nums tracking-tight text-zinc-950" data-testid="quote-gross">
                  {quote ? money(quote.grossTotal) : "—"}
                </p>
                {quote && availability && AvailIcon ? (
                  <span className={cn("mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold", TONES[availability.tone].soft)} data-testid="quote-availability">
                    <AvailIcon className="h-3.5 w-3.5" aria-hidden />
                    {t(`availability.${quote.availability}`)}
                    {quote.availability === "instant" ? ` · ${t("quote.left", { n: quote.allotmentLeft })}` : ""}
                  </span>
                ) : null}
              </div>
              {quote ? (
                <IconButton label={t("quote.copy")} variant="outline" onClick={() => void copySummary()}>
                  <ClipboardCopy className="h-4 w-4" />
                </IconButton>
              ) : null}
            </div>
          </div>

          <div className="space-y-4 p-5">
            {!hotel.isActive ? (
              <p className="rounded-2xl bg-zinc-50 px-4 py-3 text-[13px] font-medium text-zinc-500">{t("quote.inactive")}</p>
            ) : formError ? (
              <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-800" role="alert">
                {t(`quote.errors.${formError}`)}
              </p>
            ) : error ? (
              <p className="rounded-2xl bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700" role="alert">
                {error}
              </p>
            ) : null}

            {quote ? (
              <>
                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      { icon: Wallet, tone: "zinc", label: t("quote.net"), value: money(quote.netTotal), id: "net" },
                      { icon: TrendingUp, tone: "emerald", label: t("quote.profit"), value: money(quote.profit), id: "profit" },
                      { icon: UsersRound, tone: "sky", label: t("quote.guestsCount"), value: String(quote.guests), id: "guests" },
                    ] as const
                  ).map(({ icon: Icon, tone, label, value, id }) => (
                    <div key={id} className={cn("rounded-[20px] bg-gradient-to-br p-3 ring-1 ring-inset ring-zinc-900/[0.04]", TONES[tone].tint)} data-testid={`quote-${id}`}>
                      <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", TONES[tone].solid)} aria-hidden>
                        <Icon className="h-4 w-4" />
                      </span>
                      <p className="mt-2 truncate text-[15px] font-semibold tabular-nums text-zinc-950">{value}</p>
                      <p className="truncate text-[11.5px] font-medium text-zinc-500">{label}</p>
                    </div>
                  ))}
                </div>

                {quote.missingDates.length > 0 ? (
                  <p className="flex items-start gap-2 rounded-2xl bg-zinc-50 px-4 py-3 text-[12.5px] font-medium text-zinc-600">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                    {t("quote.missing", { n: quote.missingDates.length })}
                  </p>
                ) : null}

                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-zinc-600">
                    <UtensilsCrossed className="h-4 w-4 text-amber-500" aria-hidden />
                    {t("quote.nightly")}
                  </p>
                  <ul className="max-h-64 space-y-1 overflow-y-auto pe-1" data-testid="quote-nights">
                    {quote.nightsDetail.map((n) => {
                      const look = n.seasonKind ? SEASON_LOOK[n.seasonKind] : null;
                      return (
                        <li key={n.date} className={cn("flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[12.5px]", n.stopSale ? "bg-rose-50" : !n.priced ? "bg-zinc-50" : "bg-white")}>
                          <span className="w-24 shrink-0 font-semibold tabular-nums text-zinc-700">{formatDay(n.date, locale)}</span>
                          {look ? <span className={cn("truncate rounded-full px-2 py-0.5 text-[11px] font-semibold", TONES[look.tone].soft)}>{n.seasonName}</span> : null}
                          {n.stopSale ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">{t("card.stopSale")}</span> : null}
                          {!n.priced ? <span className="text-[11.5px] font-medium text-zinc-400">{t("quote.noRate")}</span> : null}
                          <span className="ms-auto shrink-0 tabular-nums text-zinc-400">{money(n.net)}</span>
                          <span className="w-24 shrink-0 text-end font-semibold tabular-nums text-zinc-900">{money(n.gross)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {quote.children.length > 0 ? (
                  <ul className="space-y-1">
                    {quote.children.map((c, i) => (
                      <li key={i} className="flex items-center justify-between rounded-xl bg-rose-50/60 px-3 py-1.5 text-[12.5px]">
                        <span className="font-medium text-zinc-700">
                          {t("quote.childLine", { age: c.age })} · {t(`band.${c.band}`)}
                          {c.band === "child2" ? ` · ${c.bed ? t("quote.withBed") : t("quote.noBed")}` : ""}
                        </span>
                        <span className="font-semibold tabular-nums text-zinc-900">{c.net === 0 ? t("policy.child.mode.free") : `${money(c.net)} / ${t("quote.night")}`}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="rounded-[20px] bg-amber-50/60 p-3.5 ring-1 ring-inset ring-amber-900/[0.06]" data-testid="quote-cancellation">
                  <p className="flex items-center gap-1.5 text-[13px] font-semibold text-amber-900">
                    <CalendarCheck2 className="h-4 w-4" aria-hidden />
                    {quote.cancellation.freeNow
                      ? t("quote.freeUntilLine", { date: formatDay(quote.cancellation.freeUntil, locale) })
                      : t("quote.penaltyToday", { amount: money(quote.cancellation.penaltyToday) })}
                  </p>
                  <ul className="mt-2 space-y-1 text-[12.5px] text-amber-900/80">
                    {quote.cancellation.tiers.map((tier) => (
                      <li key={tier.minDays} className="flex justify-between gap-2">
                        <span>{t("quote.tierFrom", { date: formatDay(tier.from, locale) })}</span>
                        <span className="font-semibold tabular-nums">{money(tier.amount)}</span>
                      </li>
                    ))}
                    <li className="flex justify-between gap-2">
                      <span>{t("quote.noShow")}</span>
                      <span className="font-semibold tabular-nums">{money(quote.cancellation.noShow)}</span>
                    </li>
                  </ul>
                </div>
              </>
            ) : !formError && !error && hotel.isActive ? (
              <p className="py-6 text-center text-[13px] text-zinc-400">{t("quote.calculating")}</p>
            ) : null}
          </div>
        </section>

        {quote ? <VoucherPanel hotel={hotel} quote={quote} /> : null}
      </div>
    </div>
  );
}
