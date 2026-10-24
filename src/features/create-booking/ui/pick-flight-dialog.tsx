"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, PlaneTakeoff } from "lucide-react";
import {
  FLIGHTS_NOT_CONFIGURED_CODE,
  FLIGHTS_UNAVAILABLE_CODE,
  FlightOfferCard,
  createFlightRepository,
  errorSearchUrl,
  sortOffers,
  type FlightOffer,
  type FlightSearchResult,
  type OfferSort,
} from "@/entities/flight";
import { FlightSearchForm } from "@/features/flight-search";
import { defaultForm, isFlightCurrency, localDay, toSearchParams } from "@/features/flight-search/model/search-form";
import { isApiError } from "@/shared/api/api-error";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EmptyState,
  ErrorState,
  GlyphTile,
  SegmentedControl,
  useMutationFeedback,
} from "@/shared/ui";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: string;
  adults?: number;
  onPicked: (offer: FlightOffer) => void;
};

/** Full-desk fare picker for a booking — search stays in the dialog, not the URL. */
export function PickFlightDialog({ open, onOpenChange, currency, adults = 1, onPicked }: Props) {
  const t = useTranslations("bookings.form");
  const tf = useTranslations("flights");
  const feedback = useMutationFeedback();
  const [repo] = useState(createFlightRepository);
  const today = useMemo(() => localDay(new Date()), []);
  const initial = useMemo(() => {
    const base = defaultForm(today);
    return {
      ...base,
      currency: isFlightCurrency(currency) ? currency : base.currency,
      passengers: { ...base.passengers, adults: Math.max(1, Math.min(9, adults)) },
    };
  }, [today, currency, adults]);
  const [result, setResult] = useState<FlightSearchResult | null>(null);
  const [sort, setSort] = useState<OfferSort>("closest");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const offers = useMemo(() => (result ? sortOffers(result.offers, sort) : []), [result, sort]);

  async function search(form: Parameters<typeof toSearchParams>[0]) {
    const params = toSearchParams(form);
    if (!params) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await repo.search(params));
    } catch (err) {
      setResult(null);
      setError(err);
      if (!isApiError(err)) feedback.error(err, tf("loadError"));
    } finally {
      setBusy(false);
    }
  }

  const notConfigured = isApiError(error) && error.code === FLIGHTS_NOT_CONFIGURED_CODE;
  const unavailable = isApiError(error) && error.code === FLIGHTS_UNAVAILABLE_CODE;
  const fallbackUrl = isApiError(error) ? errorSearchUrl(error.details) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[80]"
        className="z-[80] flex h-[min(92vh,920px)] w-[min(96vw,1180px)] max-w-none flex-col gap-0 overflow-hidden bg-[#f4f6fa] p-0 sm:p-0"
        data-testid="create-booking-flight-dialog"
      >
        <DialogHeader className="shrink-0 space-y-0 border-b border-zinc-200/60 bg-white/80 px-5 py-4 backdrop-blur-xl sm:px-8 sm:py-5">
          <div className="flex items-center gap-3.5 pe-10">
            <GlyphTile icon={PlaneTakeoff} tone="sky" size="xl" />
            <div className="min-w-0">
              <DialogTitle className="text-[20px] leading-tight tracking-tight sm:text-[22px]">{t("pickFlightTitle")}</DialogTitle>
              <DialogDescription className="mt-1 text-[13px] leading-snug sm:text-[13.5px]">{t("pickFlightHint")}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="shrink-0 border-b border-zinc-200/50 bg-white/60 px-5 py-4 sm:px-8">
          <FlightSearchForm initial={initial} today={today} repository={repo} busy={busy} onSubmit={(form) => void search(form)} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8">
          {busy ? (
            <p className="py-16 text-center text-[13.5px] font-medium text-zinc-500">{t("searchingFlights")}</p>
          ) : notConfigured ? (
            <EmptyState icon={PlaneTakeoff} title={tf("notConfigured.title")} description={tf("notConfigured.description")} />
          ) : unavailable ? (
            <ErrorState title={tf("unavailable.title")} description={tf("unavailable.description")} />
          ) : result && offers.length === 0 ? (
            <EmptyState icon={PlaneTakeoff} title={tf("empty.title")} description={tf("empty.description")} />
          ) : offers.length ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-zinc-500">{tf("results.count", { count: offers.length })}</p>
                <SegmentedControl
                  value={sort}
                  onChange={setSort}
                  options={[
                    { value: "closest", label: tf("results.sort.closest") },
                    { value: "cheapest", label: tf("results.sort.cheapest") },
                  ]}
                />
              </div>
              <ol className="space-y-3" data-testid="create-booking-flight-offers">
                {offers.map((offer) => (
                  <li key={`${offer.airline}-${offer.flightNumber}-${offer.departureAt}-${offer.transfers}`}>
                    <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_14px_40px_-28px_rgba(15,23,42,0.4)] ring-1 ring-zinc-200/70">
                      <FlightOfferCard offer={offer} anyTime={!result?.query.time} className="rounded-none shadow-none ring-0 hover:translate-y-0" />
                      <div className="flex justify-end border-t border-zinc-100 bg-zinc-50/80 px-5 py-3">
                        <Button
                          type="button"
                          className="h-11 gap-1.5 px-5"
                          data-testid="create-booking-select-flight"
                          onClick={() => {
                            onPicked(offer);
                            onOpenChange(false);
                          }}
                        >
                          <Check className="h-4 w-4" strokeWidth={2.6} aria-hidden />
                          {t("selectFlight")}
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ) : fallbackUrl ? (
            <p className="text-[13px] text-zinc-500">{tf("hero.source")}</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
