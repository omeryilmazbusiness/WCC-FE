"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  Globe2,
  Info,
  KeyRound,
  MapPinned,
  PlaneTakeoff,
  RefreshCw,
  SearchX,
  ShieldCheck,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import {
  FLIGHTS_NOT_CONFIGURED_CODE,
  FLIGHTS_UNAVAILABLE_CODE,
  FlightOfferCard,
  createFlightRepository,
  errorSearchUrl,
  sortOffers,
  wallClockDate,
  type FlightSearchResult,
  type OfferSort,
} from "@/entities/flight";
import { FlightSearchForm, useFlightSearchUrl } from "@/features/flight-search";
import { isApiError } from "@/shared/api/api-error";
import { cn } from "@/shared/lib/cn";
import { formatDate, formatDateTime, formatNumber } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { Bone, Button, EmptyState, ErrorState, IconTile, QueryState, Screen, SegmentedControl, TONES, buttonVariants, type Tone } from "@/shared/ui";

function OffersSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" data-testid="flights-loading">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="grid items-center gap-5 rounded-[28px] bg-white p-5 ring-1 ring-zinc-200/70 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.1fr)_13rem] lg:p-6"
        >
          <div className="flex items-center gap-3">
            <Bone className="h-12 w-12 rounded-[16px]" />
            <div className="flex-1 space-y-2">
              <Bone className="h-4 w-2/3" />
              <Bone className="h-3 w-1/3" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Bone className="h-8 w-16" />
            <Bone className="h-[2px] flex-1" />
            <Bone className="h-8 w-12" />
          </div>
          <div className="flex items-center justify-end gap-3">
            <Bone className="h-7 w-16" />
            <Bone className="h-11 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function HeroChip({ icon: Icon, tone, children }: { icon: LucideIcon; tone: Tone; children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-[0_6px_16px_-12px_rgba(15,23,42,0.4)] ring-1 ring-zinc-200/60 backdrop-blur">
      <Icon className={cn("h-3.5 w-3.5", TONES[tone].text)} aria-hidden />
      {children}
    </li>
  );
}

function FlightsHero() {
  const t = useTranslations("flights");
  return (
    <header className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-6 ring-1 ring-sky-100/80 sm:p-8">
      <span aria-hidden className="pointer-events-none absolute -end-16 -top-20 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-24 end-40 h-56 w-56 rounded-full bg-indigo-200/40 blur-3xl" />
      <PlaneTakeoff
        aria-hidden
        className="pointer-events-none absolute -bottom-6 end-6 h-40 w-40 text-sky-500/[0.07] rtl:-scale-x-100"
        strokeWidth={1.2}
      />
      <div className="relative flex items-start gap-4">
        <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px]", TONES.sky.gradient)}>
          <PlaneTakeoff className="h-7 w-7 rtl:-scale-x-100" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">{t("title")}</h1>
          <p className="max-w-2xl text-sm font-medium text-zinc-500">{t("subtitle")}</p>
        </div>
      </div>
      <ul className="relative mt-5 flex flex-wrap gap-2">
        <HeroChip icon={BadgeCheck} tone="sky">
          {t("hero.source")}
        </HeroChip>
        <HeroChip icon={CalendarClock} tone="violet">
          {t("hero.window")}
        </HeroChip>
        <HeroChip icon={ShieldCheck} tone="emerald">
          {t("hero.secure")}
        </HeroChip>
      </ul>
    </header>
  );
}

function IdleGuide() {
  const t = useTranslations("flights.idle");
  const steps: { icon: LucideIcon; tone: Tone; text: string }[] = [
    { icon: MapPinned, tone: "sky", text: t("steps.route") },
    { icon: CalendarClock, tone: "violet", text: t("steps.time") },
    { icon: Ticket, tone: "emerald", text: t("steps.book") },
  ];
  return (
    <div className="rounded-[28px] bg-white/70 p-6 text-center ring-1 ring-zinc-200/70 sm:p-8" data-testid="flights-idle">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-950">{t("title")}</h2>
      <p className="mx-auto mt-1.5 max-w-xl text-sm font-medium text-zinc-500">{t("description")}</p>
      <ol className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step.text} className="flex items-center gap-3 rounded-[20px] bg-white p-3.5 text-start shadow-[0_10px_28px_-22px_rgba(15,23,42,0.4)] ring-1 ring-zinc-200/70">
            <IconTile icon={step.icon} tone={step.tone} size="lg" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">{i + 1}</p>
              <p className="text-sm font-semibold text-zinc-800">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Hands the whole search off to Aviasales (affiliate marker in the link). */
function ProviderSearchLink({ href, primary = false }: { href: string; primary?: boolean }) {
  const t = useTranslations("flights");
  if (!href) return null;
  return (
    <div
      className="flex flex-col items-center gap-4 rounded-[24px] bg-gradient-to-br from-sky-50/90 via-white to-indigo-50/80 p-4 text-center ring-1 ring-sky-100 sm:flex-row sm:text-start"
      data-testid="flights-provider-search"
    >
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", TONES.indigo.gradient)}>
        <Globe2 className="h-5 w-5" aria-hidden />
      </span>
      <p className="min-w-0 flex-1 text-sm font-medium text-zinc-600">{t("providerSearchHint")}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className={buttonVariants({
          variant: primary ? "default" : "outline",
          className: cn(
            "h-11 rounded-full px-5",
            primary &&
              "bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-[0_12px_26px_-12px_rgba(79,70,229,0.7)] hover:bg-transparent hover:from-sky-400 hover:to-indigo-500",
          ),
        })}
      >
        {t("providerSearch")}
        <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
      </a>
    </div>
  );
}

function ResultSummary({
  result,
  sort,
  onSort,
  refreshing,
  onRefresh,
}: {
  result: FlightSearchResult;
  sort: OfferSort;
  onSort: (sort: OfferSort) => void;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const t = useTranslations("flights.results");
  const locale = useLocale();
  const wanted = wallClockDate(result.query.departure);
  const clock = result.query.time ? ({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" } as const) : {};
  const when = wanted ? formatDate(wanted, locale, { weekday: "short", day: "numeric", month: "short", ...clock, timeZone: "UTC" }) : "—";

  return (
    <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <p className="flex flex-wrap items-center gap-2 text-base font-semibold text-zinc-950" data-testid="flights-summary">
          <bdi
            dir="ltr"
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-mono text-sm font-bold shadow-[0_6px_16px_-12px_rgba(15,23,42,0.4)] ring-1 ring-zinc-200/70"
          >
            {result.query.origin}
            <ArrowRight className="h-3.5 w-3.5 text-sky-500" aria-hidden />
            {result.query.destination}
          </bdi>
          <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
            {t("count", { count: result.offers.length })}
          </span>
        </p>
        <p className="text-xs font-medium text-zinc-500">
          {t("around", { when, days: formatNumber(result.windowHours / 24, locale) })}
          {result.fetchedAt ? ` · ${t("updated", { at: formatDateTime(result.fetchedAt, locale) })}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <SegmentedControl<OfferSort>
          value={sort}
          onChange={onSort}
          aria-label={t("sortLabel")}
          options={[
            { value: "closest", label: t("sort.closest") },
            { value: "cheapest", label: t("sort.cheapest") },
          ]}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label={t("refresh")}
          title={t("refresh")}
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} aria-hidden />
        </Button>
      </div>
    </div>
  );
}

/**
 * Flight finder for agents: the wanted departure goes in, fares closest to it come out,
 * and booking hands off to Aviasales (affiliate link) in a new tab.
 */
export function FlightsBoard() {
  const t = useTranslations("flights");
  const [repo] = useState(createFlightRepository);
  const { form, params, key, today, submit } = useFlightSearchUrl();
  const [sort, setSort] = useState<OfferSort>("closest");

  const search = useApiQuery(() => (params ? repo.search(params) : Promise.reject(new Error("no search"))), [repo, key], {
    enabled: params !== null,
  });
  const result = params ? search.data : undefined;
  const offers = useMemo(() => (result ? sortOffers(result.offers, sort) : []), [result, sort]);

  const err = search.error;
  const notConfigured = isApiError(err) && err.code === FLIGHTS_NOT_CONFIGURED_CODE;
  const unavailable = isApiError(err) && err.code === FLIGHTS_UNAVAILABLE_CODE;
  const fallbackUrl = isApiError(err) ? errorSearchUrl(err.details) : "";

  function retryWithStops() {
    submit({ ...form, direct: false });
  }

  let body: React.ReactNode;
  if (!params) {
    body = <IdleGuide />;
  } else if (search.loading) {
    body = <OffersSkeleton />;
  } else if (notConfigured) {
    body = (
      <div className="space-y-4">
        <EmptyState icon={KeyRound} title={t("notConfigured.title")} description={t("notConfigured.description")} />
        <ProviderSearchLink href={fallbackUrl} primary />
      </div>
    );
  } else if (unavailable) {
    body = (
      <div className="space-y-4">
        <ErrorState
          title={t("unavailable.title")}
          description={t("unavailable.description")}
          retryLabel={t("unavailable.retry")}
          onRetry={() => void search.reload()}
        />
        <ProviderSearchLink href={fallbackUrl} />
      </div>
    );
  } else if (result && offers.length === 0 && !err) {
    body = (
      <div className="space-y-4">
        <EmptyState
          icon={SearchX}
          title={t("empty.title")}
          description={form.direct ? t("empty.descriptionDirect") : t("empty.description")}
          actionLabel={form.direct ? t("empty.includeStops") : undefined}
          onAction={form.direct ? retryWithStops : undefined}
        />
        <ProviderSearchLink href={result.searchUrl} />
      </div>
    );
  } else {
    body = (
      <QueryState error={err} errorTitle={t("loadError")} onRetry={() => void search.reload()}>
        {result ? (
          <div className="space-y-3">
            <ResultSummary
              result={result}
              sort={sort}
              onSort={setSort}
              refreshing={search.loading}
              onRefresh={() => void search.reload()}
            />
            <ol className="space-y-3" data-testid="flight-offers">
              {offers.map((offer) => (
                <li key={`${offer.airline}-${offer.flightNumber}-${offer.departureAt}-${offer.transfers}`}>
                  <FlightOfferCard offer={offer} anyTime={!result.query.time} />
                </li>
              ))}
            </ol>
            <ProviderSearchLink href={result.searchUrl} />
          </div>
        ) : null}
      </QueryState>
    );
  }

  return (
    <Screen data-testid="flights">
      <FlightsHero />
      <FlightSearchForm
        key={JSON.stringify(form)}
        initial={form}
        today={today}
        repository={repo}
        busy={search.loading}
        onSubmit={(next) => {
          setSort("closest");
          if (!submit(next)) void search.reload();
        }}
      />
      <section aria-live="polite" aria-busy={search.loading}>
        {body}
      </section>
      <p
        className="flex items-start gap-2.5 rounded-[20px] bg-zinc-50/80 px-4 py-3 text-xs font-medium leading-relaxed text-zinc-500 ring-1 ring-inset ring-zinc-200/60"
        data-testid="flights-disclaimer"
      >
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-500" aria-hidden />
        {t("disclaimer")}
      </p>
    </Screen>
  );
}
