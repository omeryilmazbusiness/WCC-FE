"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Pencil, Plus } from "lucide-react";
import {
  FX_PAGE_SIZE,
  createFxRepository,
  formatFxRate,
  normalizeCurrency,
  type FxFilters,
  type FxRate,
} from "@/entities/fx";
import { Can } from "@/entities/viewer";
import { FxConverter } from "@/features/convert-currency";
import { DeleteFxRateButton, FxRateDialog } from "@/features/manage-fx-rates";
import { cn } from "@/shared/lib/cn";
import { formatDateTime, formatDay, formatNumber } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import {
  Button,
  Input,
  Label,
  PageHeader,
  QueryState,
  Screen,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui";

const FILTER_DEBOUNCE_MS = 350;

export function FxRatesBoard() {
  const t = useTranslations("fx");
  const locale = useLocale();
  const [repo] = useState(() => createFxRepository());
  const [baseInput, setBaseInput] = useState("");
  const [quoteInput, setQuoteInput] = useState("");
  const [pair, setPair] = useState({ base: "", quote: "" });
  const [fromDay, setFromDay] = useState("");
  const [toDay, setToDay] = useState("");
  const [offset, setOffset] = useState(0);
  const [dialog, setDialog] = useState<{ rate?: FxRate } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPair({ base: normalizeCurrency(baseInput), quote: normalizeCurrency(quoteInput) });
      setOffset(0);
    }, FILTER_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [baseInput, quoteInput]);

  const filters = useMemo<FxFilters>(
    () => ({
      base: pair.base || undefined,
      quote: pair.quote || undefined,
      from: fromDay || undefined,
      to: toDay || undefined,
    }),
    [pair, fromDay, toDay],
  );
  const rates = useApiQuery(() => repo.list(filters, { limit: FX_PAGE_SIZE, offset }), [repo, filters, offset]);
  const page = rates.data;
  const rows = page?.items ?? [];
  const isFiltered = Object.values(filters).some(Boolean);

  function resetFilters() {
    setBaseInput("");
    setQuoteInput("");
    setPair({ base: "", quote: "" });
    setFromDay("");
    setToDay("");
    setOffset(0);
  }

  return (
    <Screen data-testid="fx-rates">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Can perm="fx.manage">
            <Button type="button" onClick={() => setDialog({})} data-testid="fx-rate-add">
              <Plus className="h-4 w-4" />
              {t("add")}
            </Button>
          </Can>
        }
      />

      <FxConverter repository={repo} />

      <div className="grid gap-3 rounded-[24px] border border-zinc-200/80 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="fx-filter-base">{t("filters.base")}</Label>
          <Input
            id="fx-filter-base"
            dir="ltr"
            maxLength={3}
            placeholder="USD"
            value={baseInput}
            onChange={(e) => setBaseInput(e.target.value.toUpperCase())}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fx-filter-quote">{t("filters.quote")}</Label>
          <Input
            id="fx-filter-quote"
            dir="ltr"
            maxLength={3}
            placeholder="SAR"
            value={quoteInput}
            onChange={(e) => setQuoteInput(e.target.value.toUpperCase())}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fx-filter-from">{t("filters.from")}</Label>
          <Input
            id="fx-filter-from"
            type="date"
            value={fromDay}
            max={toDay || undefined}
            onChange={(e) => {
              setFromDay(e.target.value);
              setOffset(0);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fx-filter-to">{t("filters.to")}</Label>
          <Input
            id="fx-filter-to"
            type="date"
            value={toDay}
            min={fromDay || undefined}
            onChange={(e) => {
              setToDay(e.target.value);
              setOffset(0);
            }}
          />
        </div>
        {isFiltered ? (
          <div className="sm:col-span-full">
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
              {t("filters.reset")}
            </Button>
          </div>
        ) : null}
      </div>

      <QueryState
        loading={rates.loading && !page}
        error={rates.error}
        errorTitle={t("loadError")}
        onRetry={() => void rates.reload()}
        empty={rows.length === 0}
        emptyTitle={isFiltered ? t("emptyFiltered") : t("empty")}
      >
        <div
          className={cn(
            "rounded-[24px] border border-zinc-200/80 bg-white transition-opacity",
            rates.loading && "opacity-60",
          )}
        >
          <Table data-testid="fx-rates-table">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("columns.pair")}</TableHead>
                <TableHead>{t("columns.rate")}</TableHead>
                <TableHead>{t("columns.effectiveDate")}</TableHead>
                <TableHead>{t("columns.source")}</TableHead>
                <TableHead>{t("columns.createdBy")}</TableHead>
                <TableHead>{t("columns.createdAt")}</TableHead>
                <Can perm="fx.manage">
                  <TableHead className="w-24">
                    <span className="sr-only">{t("columns.actions")}</span>
                  </TableHead>
                </Can>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((rate) => (
                <TableRow key={rate.id} data-testid="fx-rate-row">
                  <TableCell>
                    <bdi dir="ltr" className="font-mono text-xs font-semibold text-zinc-900">
                      {rate.base}/{rate.quote}
                    </bdi>
                  </TableCell>
                  <TableCell>
                    <bdi dir="ltr" className="font-mono text-sm tabular-nums text-zinc-900" title={rate.rate}>
                      {formatFxRate(rate.rate)}
                    </bdi>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDay(rate.effectiveDate, locale)}</TableCell>
                  <TableCell>{rate.source || "—"}</TableCell>
                  <TableCell>{rate.createdBy || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-zinc-500">
                    {rate.createdAt ? formatDateTime(rate.createdAt, locale) : "—"}
                  </TableCell>
                  <Can perm="fx.manage">
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={t("edit")}
                          onClick={() => setDialog({ rate })}
                          data-testid="fx-rate-edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <DeleteFxRateButton rate={rate} repository={repo} onDeleted={() => void rates.reload()} />
                      </div>
                    </TableCell>
                  </Can>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {page ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500">
            <span>
              {t("pagination.summary", {
                from: formatNumber(page.offset + 1, locale),
                to: formatNumber(page.offset + rows.length, locale),
                total: formatNumber(page.total, locale),
              })}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page.offset === 0 || rates.loading}
                onClick={() => setOffset(Math.max(0, page.offset - page.limit))}
              >
                <ChevronLeft className="h-3.5 w-3.5 rtl:-scale-x-100" />
                {t("pagination.previous")}
              </Button>
              <span className="tabular-nums">
                {t("pagination.page", { page: page.page, pages: Math.max(1, page.totalPages) })}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page.page >= page.totalPages || rates.loading}
                onClick={() => setOffset(page.offset + page.limit)}
              >
                {t("pagination.next")}
                <ChevronRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
              </Button>
            </div>
          </div>
        ) : null}
      </QueryState>

      {dialog ? (
        <FxRateDialog
          key={dialog.rate?.id ?? "new"}
          repository={repo}
          rate={dialog.rate}
          open
          onOpenChange={(open) => !open && setDialog(null)}
          onSaved={() => void rates.reload()}
        />
      ) : null}
    </Screen>
  );
}
