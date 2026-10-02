"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, ArrowUpRight, Info, KeyRound, Plane, RefreshCw, SearchX } from "lucide-react";
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
import { Bone, Button, EmptyState, ErrorState, PageHeader, QueryState, Screen, SegmentedControl, buttonVariants } from "@/shared/ui";

function OffersSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" data-testid="flights-loading">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-[24px] border border-zinc-200/80 bg-white p-5">
          <Bone className="h-11 w-11 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Bone className="h-4 w-1/3" />
            <Bone className="h-3 w-1/2" />
          </div>
          <Bone className="h-8 w-24 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/** Hands the whole search off to Aviasales (affiliate marker in the link). */
function ProviderSearchLink({ href, primary = false }: { href: string; primary?: boolean }) {
  const t = useTranslations("flights");
  if (!href) return null;
  return (
    <div className="flex flex-col items-center gap-2 text-center" data-testid="flights-provider-search">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className={buttonVariants({ variant: primary ? "default" : "outline", size: "sm", className: "h-10 px-4 text-sm" })}
      >
        {t("providerSearch")}
        <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
      </a>
      <p className="text-xs font-medium text-zinc-500">{t("providerSearchHint")}</p>
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
  const when = wanted
    ? formatDate(wanted, locale, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" })
    : "—";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="flex flex-wrap items-center gap-2 text-base font-semibold text-zinc-950" data-testid="flights-summary">
          <bdi dir="ltr" className="inline-flex items-center gap-1.5 font-mono">
            {result.query.origin}
            <ArrowRight className="h-4 w-4 text-zinc-400" aria-hidden />
            {result.query.destination}
          </bdi>
          <span className="text-zinc-300">·</span>
          <span>{t("count", { count: result.offers.length })}</span>
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
        <Button type="button" variant="outline" size="icon" onClick={onRefresh} disabled={refreshing} aria-label={t("refresh")} title={t("refresh")}>
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
    body = (
      <EmptyState
        icon={Plane}
        title={t("idle.title")}
        description={t("idle.description")}
        className="py-14"
      />
    );
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
                  <FlightOfferCard offer={offer} />
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
      <PageHeader title={t("title")} description={t("subtitle")} />
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
      <p className="flex items-start gap-2 text-xs font-medium text-zinc-500" data-testid="flights-disclaimer">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        {t("disclaimer")}
      </p>
    </Screen>
  );
}
