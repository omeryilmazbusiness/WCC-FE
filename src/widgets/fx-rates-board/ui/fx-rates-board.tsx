"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftRight, ChevronLeft, CircleCheck, Clock3, Layers, Plus } from "lucide-react";
import {
  createFxRepository,
  freshness,
  localToday,
  pairSnapshots,
  type FxRate,
} from "@/entities/fx";
import { useCurrencyName } from "@/entities/fx-live";
import { Can } from "@/entities/viewer";
import { FxConverter } from "@/features/convert-currency";
import { FxRateDialog } from "@/features/manage-fx-rates";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { Button, ErrorState, PageHeader, Screen, TONES } from "@/shared/ui";
import { useRateFilters } from "../model/use-rate-filters";
import { LiveMarketCard } from "./live-market-card";
import { PairCard } from "./pair-card";
import { RateHistory } from "./rate-history";

/** Rows read for the pair overview; matches the API's page-size cap. */
const SNAPSHOT_LIMIT = 100;
/** History rows per page. */
const HISTORY_PAGE_SIZE = 10;
/** Pair cards shown before "Show all". */
const PAIR_PREVIEW = 8;

type DialogState = { rate?: FxRate; defaults?: { base: string; quote: string } };

/** Accounting FX rates: latest per pair, converter, live market and the full history. */
export function FxRatesBoard() {
  const t = useTranslations("fx");
  const [repo] = useState(() => createFxRepository());
  const [today] = useState(() => localToday());
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [showAllPairs, setShowAllPairs] = useState(false);
  const currencyName = useCurrencyName();
  const filters = useRateFilters();

  const snapshot = useApiQuery(() => repo.list({}, { limit: SNAPSHOT_LIMIT, offset: 0 }), [repo], {
    cacheKey: ["fx-rates", "snapshot"],
  });
  const history = useApiQuery(
    () => repo.list(filters.filters, { limit: HISTORY_PAGE_SIZE, offset: filters.page * HISTORY_PAGE_SIZE }),
    [repo, filters.filters, filters.page],
    { cacheKey: ["fx-rates", filters.filters, filters.page, HISTORY_PAGE_SIZE] },
  );

  const pairs = useMemo(() => pairSnapshots(snapshot.data?.items ?? []), [snapshot.data]);
  const visiblePairs = showAllPairs ? pairs : pairs.slice(0, PAIR_PREVIEW);
  const upToDate = pairs.filter((p) => freshness(p.latest.effectiveDate, today) === "today").length;
  const stale = pairs.filter((p) => freshness(p.latest.effectiveDate, today) === "stale").length;
  const currencies = useMemo(() => [...new Set(pairs.flatMap((p) => [p.base, p.quote]))].sort(), [pairs]);
  const first = pairs[0];

  function refresh() {
    void snapshot.refresh();
    void history.refresh();
  }

  return (
    <Screen data-testid="fx-rates">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href={routes.finance}>
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
                {t("backToFinance")}
              </Link>
            </Button>
            <Can perm="fx.manage">
              <Button type="button" onClick={() => setDialog({})} data-testid="fx-rate-add">
                <Plus className="h-4 w-4" aria-hidden />
                {t("add")}
              </Button>
            </Can>
          </>
        }
      />

      {pairs.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label={t("summary.label")} data-testid="fx-summary">
          <SummaryPill icon={Layers} tone="zinc" label={t("summary.pairs", { count: pairs.length })} />
          <SummaryPill icon={CircleCheck} tone="emerald" label={t("summary.upToDate", { count: upToDate, total: pairs.length })} />
          {stale > 0 ? <SummaryPill icon={Clock3} tone="amber" label={t("summary.stale", { count: stale })} /> : null}
        </ul>
      ) : null}

      <section aria-label={t("pairs.title")} className="@container" data-testid="fx-pairs">
        {snapshot.loading && !snapshot.data ? (
          <div className="grid gap-3.5 @xl:grid-cols-2 @4xl:grid-cols-3 @5xl:grid-cols-4" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[184px] animate-pulse rounded-[28px] bg-zinc-100" />
            ))}
          </div>
        ) : snapshot.error && !snapshot.data ? (
          <ErrorState title={t("loadError")} onRetry={() => void snapshot.reload()} />
        ) : pairs.length === 0 ? (
          <EmptyPairs onAdd={() => setDialog({})} />
        ) : (
          <>
            <div className="grid gap-3.5 @xl:grid-cols-2 @4xl:grid-cols-3 @5xl:grid-cols-4">
              {visiblePairs.map((p) => (
                <PairCard
                  key={p.pair}
                  snapshot={p}
                  today={today}
                  currencyName={currencyName}
                  selected={filters.activePair === p.pair}
                  onSelect={() => filters.togglePair(p.base, p.quote)}
                  onAddToday={() => setDialog({ defaults: { base: p.base, quote: p.quote } })}
                />
              ))}
            </div>
            {pairs.length > PAIR_PREVIEW ? (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAllPairs((v) => !v)}
                  className="h-9 rounded-full px-4 text-[13px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
                >
                  {showAllPairs ? t("pairs.showLess") : t("pairs.showAll", { count: pairs.length })}
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      <div className="@container">
        <div className="grid items-stretch gap-3.5 @4xl:grid-cols-5">
        {snapshot.data || snapshot.error ? (
          <FxConverter
            repository={repo}
            defaultFrom={first?.base ?? "USD"}
            defaultTo={first?.quote ?? "SAR"}
            currencies={currencies}
            className="@4xl:col-span-3"
          />
        ) : (
          <div className="min-h-[320px] animate-pulse rounded-[28px] bg-zinc-100 @4xl:col-span-3" aria-hidden />
        )}
        <LiveMarketCard onAdopted={refresh} className="@4xl:col-span-2" />
        </div>
      </div>

      <RateHistory
        query={history}
        filters={filters}
        pairs={pairs}
        repository={repo}
        today={today}
        onEdit={(rate) => setDialog({ rate })}
        onChanged={refresh}
      />

      {dialog ? (
        <FxRateDialog
          key={dialog.rate?.id ?? `new-${dialog.defaults?.base ?? ""}${dialog.defaults?.quote ?? ""}`}
          repository={repo}
          rate={dialog.rate}
          defaults={dialog.defaults}
          open
          onOpenChange={(open) => !open && setDialog(null)}
          onSaved={refresh}
        />
      ) : null}
    </Screen>
  );
}

function SummaryPill({ icon: Icon, tone, label }: { icon: typeof Layers; tone: "zinc" | "emerald" | "amber"; label: string }) {
  return (
    <li className={cn("flex h-9 items-center gap-2 rounded-full ps-1.5 pe-3.5 text-[13px] font-semibold", TONES[tone].soft)}>
      <span className={cn("flex h-6 w-6 items-center justify-center rounded-full", TONES[tone].solid)} aria-hidden>
        <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
      </span>
      {label}
    </li>
  );
}

function EmptyPairs({ onAdd }: { onAdd: () => void }) {
  const t = useTranslations("fx");
  return (
    <div className="flex flex-col items-center gap-4 rounded-[28px] border border-dashed border-zinc-200 bg-gradient-to-b from-zinc-50 to-white px-6 py-12 text-center">
      <span className={cn("flex h-16 w-16 items-center justify-center rounded-[22px]", TONES.indigo.gradient)} aria-hidden>
        <ArrowLeftRight className="h-8 w-8" strokeWidth={2} />
      </span>
      <div className="max-w-md space-y-1">
        <p className="text-[17px] font-semibold tracking-tight text-zinc-950">{t("empty")}</p>
        <p className="text-[13.5px] text-zinc-500">{t("emptyHint")}</p>
      </div>
      <Can perm="fx.manage">
        <Button type="button" onClick={onAdd} data-testid="fx-empty-add">
          <Plus className="h-4 w-4" aria-hidden />
          {t("add")}
        </Button>
      </Can>
    </div>
  );
}
