"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarClock,
  CircleCheckBig,
  Download,
  FileStack,
  FileWarning,
  Hash,
  PlaneTakeoff,
  Search,
  Users,
} from "lucide-react";
import {
  createDocumentRepository,
  daysUntil,
  departureUrgency,
  documentKindLook,
  filterMissing,
  missingDocsCsv,
  sortMissing,
  summarizeMissing,
  type DepartureUrgency,
  type DocumentRepository,
} from "@/entities/document";
import { createTourPackageRepository, type TourPackageRepository } from "@/entities/tourpackage";
import { useCan } from "@/entities/viewer";
import { cn } from "@/shared/lib/cn";
import { saveBlob } from "@/shared/lib/download";
import { formatDay, formatNumber } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { Button, IconInput, PageHeader, QueryState, Screen, StatTile, TONES, type Tone } from "@/shared/ui";
import { useDepartureParam } from "../model/use-departure-param";
import { DeparturePicker, packageName } from "./departure-picker";
import { MissingRow } from "./missing-row";

type Props = { repository?: DocumentRepository; packages?: TourPackageRepository };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const URGENCY_TONE: Record<DepartureUrgency, Tone> = {
  past: "zinc",
  critical: "rose",
  soon: "amber",
  planned: "sky",
};

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Required documents still missing on a departure's bookings, ready for ops follow-up. */
export function MissingDocsBoard({ repository, packages }: Props) {
  const t = useTranslations("missingDocs");
  const tKind = useTranslations("ops.docKind");
  const tStatus = useTranslations("bookings.status");
  const locale = useLocale();
  const [docs] = useState(() => repository ?? createDocumentRepository());
  const [tours] = useState(() => packages ?? createTourPackageRepository());
  const [today] = useState(isoToday);
  const canBrowse = useCan("packages.read");
  const [departureId, selectDeparture] = useDepartureParam();
  const [kind, setKind] = useState("");
  const [query, setQuery] = useState("");

  const missing = useApiQuery(() => docs.missingDocs(departureId), [docs, departureId], {
    enabled: Boolean(departureId),
    liveTopics: ["document", "booking"],
    cacheKey: ["missing-docs", departureId],
  });
  const departure = useApiQuery(() => tours.getDeparture(departureId), [tours, departureId], {
    enabled: Boolean(departureId) && canBrowse,
    cacheKey: ["departure", departureId],
  });
  const pkgId = departure.data?.packageId ?? "";
  const pkg = useApiQuery(() => tours.getPackage(pkgId), [tours, pkgId], {
    enabled: Boolean(pkgId),
    cacheKey: ["package", pkgId],
  });

  const rows = useMemo(() => (departureId ? missing.data ?? [] : []), [departureId, missing.data]);
  const summary = useMemo(() => summarizeMissing(rows), [rows]);
  const visible = useMemo(() => sortMissing(filterMissing(rows, { kind, query })), [rows, kind, query]);
  const kindLabel = (k: string) => (tKind.has(k) ? tKind(k) : k);
  const topKind = summary.byKind[0];
  const TopIcon = topKind ? documentKindLook(topKind.kind).icon : FileStack;

  function choose(id: string) {
    setKind("");
    setQuery("");
    selectDeparture(id);
  }

  function exportCsv() {
    const csv = missingDocsCsv(visible, {
      headers: [t("csv.booking"), t("csv.customer"), t("csv.travellers"), t("csv.status"), t("csv.missing"), t("csv.bookingId")],
      kind: kindLabel,
      status: (s) => (tStatus.has(s) ? tStatus(s) : s),
    });
    const code = departure.data?.code || departureId.slice(0, 8);
    saveBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `missing-docs-${code}.csv`);
  }

  return (
    <Screen data-testid="missing-docs-board">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Button type="button" variant="secondary" disabled={visible.length === 0} onClick={exportCsv} data-testid="md-export">
            <Download className="h-4 w-4" aria-hidden />
            {t("export")}
          </Button>
        }
      />

      {canBrowse ? (
        <DeparturePicker
          repository={tours}
          selectedId={departureId}
          selectedPackageId={pkgId || undefined}
          today={today}
          onSelect={choose}
        />
      ) : (
        <ManualDeparture initial={departureId} onSubmit={choose} />
      )}

      {!departureId ? (
        <Hero icon={PlaneTakeoff} tone="sky" title={t("choose.title")} hint={t("choose.hint")} testId="md-choose" />
      ) : (
        <>
          {departure.data ? (
            <DepartureBanner
              title={pkg.data ? packageName(pkg.data, locale) : departure.data.code}
              code={departure.data.code}
              departDate={departure.data.departDate}
              returnDate={departure.data.returnDate}
              today={today}
            />
          ) : null}

          {missing.data && rows.length > 0 ? (
            <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4" data-testid="md-stats">
              <StatTile icon={FileWarning} tone="rose" label={t("stats.bookings")} value={formatNumber(summary.bookings, locale)} />
              <StatTile icon={Users} tone="sky" label={t("stats.travellers")} value={formatNumber(summary.travellers, locale)} />
              <StatTile icon={FileStack} tone="violet" label={t("stats.gaps")} value={formatNumber(summary.gaps, locale)} />
              <StatTile
                icon={TopIcon}
                tone={topKind ? documentKindLook(topKind.kind).tone : "zinc"}
                label={t("stats.top")}
                value={topKind ? kindLabel(topKind.kind) : "—"}
                caption={topKind ? t("stats.topCaption", { count: topKind.count, formatted: formatNumber(topKind.count, locale) }) : undefined}
              />
            </div>
          ) : null}

          <QueryState
            loading={missing.loading && !missing.data}
            loadingVariant="table"
            error={missing.error}
            errorTitle={t("loadError")}
            onRetry={() => void missing.reload()}
          >
            {rows.length === 0 ? (
              <Hero icon={CircleCheckBig} tone="emerald" title={t("allClear.title")} hint={t("allClear.hint")} testId="md-all-clear" />
            ) : (
              <section
                aria-labelledby="md-list-title"
                className="rounded-[28px] border border-zinc-200/70 bg-zinc-50/60 p-4 sm:p-5"
                data-testid="md-list"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 id="md-list-title" className="text-[16px] font-semibold tracking-tight text-zinc-950">
                    {t("list.title")}
                    <span className="ms-2 text-[13px] font-medium text-zinc-400">
                      {t("list.count", { shown: formatNumber(visible.length, locale), total: formatNumber(rows.length, locale) })}
                    </span>
                  </h2>
                  <div className="w-full sm:w-72">
                    <IconInput
                      icon={Search}
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t("list.search")}
                      aria-label={t("list.search")}
                      className="h-11 rounded-2xl bg-white"
                      data-testid="md-search"
                    />
                  </div>
                </div>

                <div
                  role="group"
                  aria-label={t("list.kindFilter")}
                  className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  <KindChip active={!kind} onClick={() => setKind("")} label={t("list.all")} count={formatNumber(rows.length, locale)} />
                  {summary.byKind.map((k) => (
                    <KindChip
                      key={k.kind}
                      active={kind === k.kind}
                      onClick={() => setKind(kind === k.kind ? "" : k.kind)}
                      label={kindLabel(k.kind)}
                      count={formatNumber(k.count, locale)}
                      kind={k.kind}
                    />
                  ))}
                </div>

                {visible.length === 0 ? (
                  <p className="py-10 text-center text-[13.5px] text-zinc-500">{t("list.noMatch")}</p>
                ) : (
                  <ul className={cn("mt-3 space-y-2.5 transition-opacity", missing.loading && "opacity-60")}>
                    {visible.map((row) => (
                      <MissingRow key={`${row.bookingId}-${row.participantId ?? ""}`} row={row} kindLabel={kindLabel} />
                    ))}
                  </ul>
                )}
              </section>
            )}
          </QueryState>
        </>
      )}
    </Screen>
  );
}

function KindChip({ active, onClick, label, count, kind }: { active: boolean; onClick: () => void; label: string; count: string; kind?: string }) {
  const look = kind ? documentKindLook(kind) : null;
  const Icon = look?.icon;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-10 shrink-0 items-center gap-2 rounded-full ps-1.5 pe-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        !Icon && "ps-3.5",
        active ? "bg-zinc-900 text-white shadow-sm" : "bg-white text-zinc-700 ring-1 ring-inset ring-zinc-900/[0.06] hover:bg-zinc-100",
      )}
      data-testid="md-kind-chip"
    >
      {Icon && look ? (
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-full", TONES[look.tone].solid)} aria-hidden>
          <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
        </span>
      ) : null}
      {label}
      <span className={cn("rounded-full px-1.5 text-[11.5px] tabular-nums", active ? "bg-white/20" : "bg-zinc-100 text-zinc-500")}>{count}</span>
    </button>
  );
}

function DepartureBanner({ title, code, departDate, returnDate, today }: { title: string; code: string; departDate: string; returnDate: string; today: string }) {
  const t = useTranslations("missingDocs.banner");
  const locale = useLocale();
  const days = daysUntil(departDate, today);
  const urgency = departureUrgency(days);
  const tone = URGENCY_TONE[urgency];
  return (
    <div
      className={cn("flex flex-wrap items-center gap-4 rounded-[28px] border border-zinc-200/60 bg-gradient-to-br p-5", TONES[tone].tint)}
      data-testid="md-banner"
      data-urgency={urgency}
    >
      <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px]", TONES[tone].gradient)} aria-hidden>
        <CalendarClock className="h-7 w-7" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[18px] font-semibold tracking-tight text-zinc-950">{title}</p>
        <p className="truncate text-[13px] text-zinc-500">
          <bdi dir="ltr">{code}</bdi> · {formatDay(departDate, locale)}
          {returnDate ? ` – ${formatDay(returnDate, locale)}` : ""}
        </p>
      </div>
      <span className={cn("flex h-9 items-center rounded-full px-4 text-[13px] font-semibold", TONES[tone].soft)}>
        {days === null ? "—" : t(urgency, { days: Math.abs(days), formatted: formatNumber(Math.abs(days), locale) })}
      </span>
    </div>
  );
}

function Hero({ icon: Icon, tone, title, hint, testId }: { icon: typeof PlaneTakeoff; tone: Tone; title: string; hint: string; testId: string }) {
  return (
    <div
      className={cn("flex flex-col items-center gap-4 rounded-[28px] border border-zinc-200/60 bg-gradient-to-b px-6 py-14 text-center", TONES[tone].tint)}
      data-testid={testId}
    >
      <span className={cn("flex h-20 w-20 items-center justify-center rounded-[26px]", TONES[tone].gradient)} aria-hidden>
        <Icon className="h-10 w-10" strokeWidth={1.9} />
      </span>
      <div className="max-w-md space-y-1.5">
        <p className="text-[19px] font-semibold tracking-tight text-zinc-950">{title}</p>
        <p className="text-[14px] text-zinc-500">{hint}</p>
      </div>
    </div>
  );
}

function ManualDeparture({ initial, onSubmit }: { initial: string; onSubmit: (id: string) => void }) {
  const t = useTranslations("missingDocs.manual");
  const [value, setValue] = useState(initial);
  const valid = UUID.test(value.trim());
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(value.trim());
      }}
      className="flex flex-wrap items-end gap-3 rounded-[28px] border border-zinc-200/70 bg-white p-5"
      data-testid="md-manual"
    >
      <div className="min-w-[260px] flex-1 space-y-1.5">
        <label htmlFor="md-departure-id" className="block text-[12.5px] font-semibold text-zinc-600">
          {t("label")}
        </label>
        <IconInput
          id="md-departure-id"
          icon={Hash}
          dir="ltr"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("placeholder")}
          aria-invalid={value.trim() !== "" && !valid}
          className="font-mono text-[13px]"
        />
        <p className="text-[12px] text-zinc-400">{t("hint")}</p>
      </div>
      <Button type="submit" disabled={!valid} className="h-12 rounded-2xl px-6">
        {t("submit")}
      </Button>
    </form>
  );
}
