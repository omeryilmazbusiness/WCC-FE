"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  CalendarRange,
  Gauge,
  RefreshCw,
  Trash2,
  TrendingUp,
} from "lucide-react";
import {
  PeriodKindIcon,
  createRevenueTargetRepository,
  type RevenueTarget,
  type TargetContribution,
  type TargetProgress,
  type TargetSeriesPoint,
  type TargetSource,
  type TargetStatus,
  type TargetWeight,
} from "@/entities/revenuetarget";
import { useCan } from "@/entities/viewer";
import { TargetAIInsight } from "@/features/ai-target-insight";
import { CreateTargetDialog } from "@/features/create-target";
import { Link } from "@/shared/i18n/navigation";
import { routes } from "@/shared/config/routes";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Label,
  PageHeader,
  QueryState,
  Screen,
  SegmentedControl,
  useMutationFeedback,
  useToast,
} from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

type Tab = "overview" | "seasonality" | "ranking" | "chart" | "sources";

function money(amount: number, currency: string, locale?: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(0)} ${currency}`;
  }
}

function pct(bps: number) {
  return `${(bps / 100).toFixed(1)}%`;
}

const STATUS_STYLE: Record<
  TargetStatus,
  { bar: string; badge: string; text: string }
> = {
  ahead: {
    bar: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-800",
    text: "text-emerald-700",
  },
  on_track: {
    bar: "bg-sky-500",
    badge: "bg-sky-50 text-sky-800",
    text: "text-sky-700",
  },
  behind: {
    bar: "bg-rose-500",
    badge: "bg-rose-50 text-rose-800",
    text: "text-rose-700",
  },
  placeholder: {
    bar: "bg-zinc-300",
    badge: "bg-zinc-100 text-zinc-600",
    text: "text-zinc-400",
  },
};

export function TargetPerformanceBoard() {
  const t = useTranslations("targets");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { push } = useToast();
  const feedback = useMutationFeedback();
  const canWrite = useCan("targets.write");
  const canAI = useCan("ai.read");
  const repo = useMemo(() => createRevenueTargetRepository(), []);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [listLoaded, setListLoaded] = useState(false);

  const [targets, setTargets] = useState<RevenueTarget[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [progress, setProgress] = useState<TargetProgress | null>(null);
  const [weights, setWeights] = useState<TargetWeight[]>([]);
  const [contrib, setContrib] = useState<TargetContribution[]>([]);
  const [series, setSeries] = useState<TargetSeriesPoint[]>([]);
  const [sources, setSources] = useState<TargetSource[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [weightDraft, setWeightDraft] = useState(
    "8.3,8.3,8.4,8.3,8.3,8.4,8.3,8.3,8.4,8.3,8.3,8.4",
  );

  const loadList = useCallback(async () => {
    const list = await repo.list();
    setTargets(list);
    setSelectedId((current) =>
      current && list.some((x) => x.id === current) ? current : (list[0]?.id ?? null),
    );
  }, [repo]);

  const loadSelected = useCallback(
    async (id: string) => {
      const [p, c, s, src, w] = await Promise.all([
        repo.progress(id),
        repo.contributions(id),
        repo.series(id),
        repo.sources(id),
        repo.getWeights(id),
      ]);
      setProgress(p);
      setContrib(c);
      setSeries(s);
      setSources(src);
      setWeights(w);
      if (w.length > 0) {
        setWeightDraft(
          w
            .slice()
            .sort((a, b) => a.bucket - b.bucket)
            .map((x) => (x.weightBps / 100).toFixed(1))
            .join(","),
        );
      }
    },
    [repo],
  );

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      await loadList();
      if (selectedId) await loadSelected(selectedId);
      setListLoaded(true);
    } catch (err) {
      setLoadError(err);
    }
  }, [loadList, loadSelected, selectedId]);

  useEffect(() => {
    void loadList()
      .then(() => setListLoaded(true))
      .catch(setLoadError);
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setProgress(null);
      return;
    }
    void loadSelected(selectedId).catch(setLoadError);
  }, [selectedId, loadSelected]);

  async function onCreated(created: RevenueTarget) {
    setSelectedId(created.id);
    await loadList().catch(setLoadError);
  }

  async function deleteSelected() {
    if (!selectedId) return;
    setDeleting(true);
    try {
      await repo.remove(selectedId);
      feedback.success(t("deleted"));
      setConfirmDelete(false);
      setSelectedId(null);
      await loadList();
    } catch (err) {
      feedback.error(err, t("deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  async function saveSeasonality() {
    if (!selectedId) return;
    const parts = weightDraft.split(",").map((x) => Number(x.trim()));
    if (parts.length === 0 || parts.some((n) => Number.isNaN(n))) {
      push({ title: t("weightsInvalid"), tone: "error" });
      return;
    }
    const sum = parts.reduce((a, b) => a + b, 0);
    const weightsBps = parts.map((p, i) => ({
      bucket: i,
      weightBps: Math.round((p / sum) * 10000),
    }));
    const s = weightsBps.reduce((a, w) => a + w.weightBps, 0);
    if (weightsBps.length) weightsBps[0]!.weightBps += 10000 - s;
    try {
      await repo.update(selectedId, { curveType: "seasonal" });
      const saved = await repo.setWeights(selectedId, weightsBps);
      setWeights(saved);
      await loadSelected(selectedId);
      feedback.success(t("weightsSaved"));
    } catch (err) {
      feedback.error(err, t("saveError"));
    }
  }

  async function recompute() {
    if (!selectedId) return;
    try {
      const p = await repo.recompute(selectedId);
      setProgress(p);
      feedback.success(t("recomputed"));
    } catch (err) {
      feedback.error(err, t("saveError"));
    }
  }

  const status = progress?.status ?? "placeholder";
  const tone = STATUS_STYLE[status];
  const progressPct = Math.min(100, Math.max(0, (progress?.progressBps ?? 0) / 100));
  const expectedPct = Math.min(
    100,
    Math.max(
      0,
      progress && progress.targetAmount > 0
        ? (progress.expectedToDate / progress.targetAmount) * 100
        : 0,
    ),
  );
  const maxSeries = Math.max(
    1,
    ...series.map((p) => Math.max(p.actual, p.expected)),
  );
  const maxContrib = Math.max(1, ...contrib.map((c) => c.actualAmount));

  const tabOptions: { value: Tab; label: string }[] = [
    { value: "overview", label: t("tabs.overview") },
    { value: "seasonality", label: t("tabs.seasonality") },
    { value: "ranking", label: t("tabs.ranking") },
    { value: "chart", label: t("tabs.chart") },
    { value: "sources", label: t("tabs.sources") },
  ];

  return (
    <Screen data-testid="targets-board">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          canWrite ? (
            <div className="flex items-center gap-2">
              {selectedId ? (
                <>
                  <Button size="sm" variant="secondary" onClick={() => void recompute()}>
                    <RefreshCw className="me-1.5 h-3.5 w-3.5" strokeWidth={2} />
                    {t("recompute")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => setConfirmDelete(true)}
                    data-testid="target-delete"
                  >
                    <Trash2 className="me-1.5 h-3.5 w-3.5" strokeWidth={2} />
                    {t("delete")}
                  </Button>
                </>
              ) : null}
              <CreateTargetDialog repository={repo} onCreated={(created) => void onCreated(created)} />
            </div>
          ) : undefined
        }
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("deleteTitle")}
        description={t("deleteHint", { label: targets.find((x) => x.id === selectedId)?.label ?? "" })}
        confirmLabel={t("delete")}
        cancelLabel={tc("cancel")}
        onConfirm={() => void deleteSelected()}
        pending={deleting}
        destructive
      />

      <div className="mt-4 flex gap-2.5 overflow-x-auto pb-1" data-testid="target-chips">
        {targets.map((tg) => {
          const active = selectedId === tg.id;
          return (
            <button
              key={tg.id}
              type="button"
              onClick={() => setSelectedId(tg.id)}
              aria-pressed={active}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-2xl border py-1.5 pe-3.5 ps-1.5 text-start transition-all",
                active
                  ? "border-transparent bg-white shadow-[0_12px_28px_-18px_rgba(15,23,42,0.5)] ring-2 ring-zinc-900/80"
                  : "border-zinc-200/80 bg-white/70 hover:border-zinc-300 hover:bg-white",
              )}
            >
              <PeriodKindIcon kind={tg.periodKind} size="sm" />
              <span className="min-w-0">
                <span className="block max-w-[12rem] truncate text-[13px] font-semibold text-zinc-900">{tg.label}</span>
                <span className="block text-[11px] font-medium text-zinc-400">{t(`kinds.${tg.periodKind}`)}</span>
              </span>
            </button>
          );
        })}
        {targets.length === 0 ? (
          <p className="px-1 text-sm text-zinc-400">{t("emptyHint")}</p>
        ) : null}
      </div>

      {loadError || !listLoaded ? (
        <div className="mt-8">
          <QueryState
            loading={!listLoaded && !loadError}
            error={loadError}
            errorTitle={t("loadError")}
            onRetry={() => void reload()}
          >
            {null}
          </QueryState>
        </div>
      ) : !selectedId || !progress ? (
        <div className="mt-8">
          <EmptyState title={t("empty")} description={t("emptyHint")} />
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {canAI ? <TargetAIInsight targetId={selectedId} /> : null}
          {/* Progress hero — compact */}
          <section
            data-testid="target-progress-hero"
            className="rounded-[22px] border border-zinc-200/70 bg-gradient-to-br from-white via-white to-zinc-50/90 p-5 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.4)] sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-semibold text-zinc-500">
                    {progress.label}
                  </p>
                  <Badge className={cn("capitalize", tone.badge)}>
                    {t(`status.${progress.status}`)}
                  </Badge>
                  <Badge className="bg-zinc-100 text-zinc-600">
                    {t(`kinds.${progress.periodKind}`)}
                  </Badge>
                  <Badge className="bg-zinc-100 text-zinc-600">
                    {t(`metrics.${progress.metric}`)}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-[34px] font-semibold leading-none tracking-tight text-zinc-950 tabular-nums sm:text-[40px]">
                    {money(progress.actualAmount, progress.currency, locale)}
                  </p>
                  <p className="text-sm font-medium text-zinc-400">
                    {t("ofTarget", {
                      target: money(progress.targetAmount, progress.currency),
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-end">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    {t("cards.pace")}
                  </p>
                  <p className={cn("text-lg font-semibold tabular-nums", tone.text)}>
                    {pct(progress.paceBps)}
                  </p>
                </div>
                <div className="h-10 w-px bg-zinc-200" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    {t("progress")}
                  </p>
                  <p className="text-lg font-semibold tabular-nums text-zinc-900">
                    {pct(progress.progressBps)}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative mt-5 h-2.5 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="absolute inset-y-0 start-0 rounded-full bg-zinc-300/80"
                style={{ width: `${expectedPct}%` }}
                title={t("cards.expected")}
              />
              <div
                className={cn("absolute inset-y-0 start-0 rounded-full", tone.bar)}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <CalendarRange className="h-3 w-3" />
                {progress.periodStart} → {progress.periodEnd}
              </span>
              <span>
                {t("cards.expected")}:{" "}
                {money(progress.expectedToDate, progress.currency)}
              </span>
            </div>

            {progress.unconverted.length > 0 ? (
              <Link
                href={routes.financeFx}
                className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-800 hover:bg-amber-100"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {t("unconverted", { currencies: progress.unconverted.join(", ") })}
              </Link>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-200/80 sm:grid-cols-4">
              <Kpi
                icon={Gauge}
                label={t("cards.expected")}
                value={money(progress.expectedToDate, progress.currency)}
              />
              <Kpi
                icon={TrendingUp}
                label={t("cards.forecast")}
                value={money(progress.forecastAmount, progress.currency)}
              />
              <Kpi
                label={t("cards.requiredPace")}
                value={money(progress.requiredPaceDaily, progress.currency)}
                hint={t("cards.perDay")}
              />
              <Kpi
                label={t("cards.variance")}
                value={money(progress.variance, progress.currency)}
                valueClass={
                  progress.variance >= 0 ? "text-emerald-700" : "text-rose-700"
                }
              />
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl
              value={tab}
              onChange={setTab}
              options={tabOptions}
              aria-label={t("title")}
            />
          </div>

          <section className="rounded-[22px] border border-zinc-200/70 bg-white p-4 shadow-[0_12px_32px_-26px_rgba(15,23,42,0.35)] sm:p-5">
            {tab === "overview" ? (
              <p className="max-w-3xl text-[14px] leading-relaxed text-zinc-500">
                {t("analystNote")}
              </p>
            ) : null}

            {tab === "seasonality" ? (
              <div className="space-y-4">
                <p className="text-[13px] text-zinc-500">{t("seasonalityHint")}</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Label>{t("weightsCsv")}</Label>
                    <Input
                      value={weightDraft}
                      onChange={(e) => setWeightDraft(e.target.value)}
                    />
                  </div>
                  <Button disabled={!canWrite} onClick={() => void saveSeasonality()}>
                    {t("saveWeights")}
                  </Button>
                </div>
                {weights.length > 0 ? (
                  <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
                    {weights
                      .slice()
                      .sort((a, b) => a.bucket - b.bucket)
                      .map((w) => {
                        const h = Math.max(8, (w.weightBps / 10000) * 72);
                        return (
                          <div
                            key={w.bucket}
                            className="flex flex-col items-center gap-1"
                          >
                            <div className="flex h-[72px] w-full items-end justify-center rounded-lg bg-zinc-50 px-1">
                              <div
                                className="w-full max-w-[18px] rounded-md bg-zinc-800"
                                style={{ height: h }}
                              />
                            </div>
                            <p className="text-[10px] font-semibold text-zinc-400">
                              M{w.bucket + 1}
                            </p>
                            <p className="text-[11px] font-semibold tabular-nums text-zinc-700">
                              {(w.weightBps / 100).toFixed(1)}%
                            </p>
                          </div>
                        );
                      })}
                  </div>
                ) : null}
              </div>
            ) : null}

            {tab === "ranking" ? (
              contrib.length === 0 ? (
                <EmptyState title={t("rankingEmpty")} />
              ) : (
                <ul className="space-y-2.5" data-testid="target-contributions">
                  {contrib.map((c) => (
                    <li
                      key={c.userId}
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl px-1 py-1.5"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-[12px] font-bold text-zinc-700">
                        {c.rank}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-[14px] font-semibold text-zinc-900">
                            {c.userName}
                          </p>
                          <p className="shrink-0 text-[13px] font-semibold tabular-nums text-zinc-800">
                            {money(c.actualAmount, progress.currency)}
                          </p>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full rounded-full bg-zinc-800"
                            style={{
                              width: `${(c.actualAmount / maxContrib) * 100}%`,
                            }}
                          />
                        </div>
                        <p className="mt-1 text-[11px] font-medium text-zinc-400">
                          {pct(c.shareBps)} {t("share")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            ) : null}

            {tab === "chart" ? (
              <div data-testid="target-series">
                {series.length === 0 ? (
                  <EmptyState title={t("chartEmpty")} />
                ) : (
                  <div className="space-y-3">
                    <div className="flex h-44 items-end gap-[3px] sm:gap-1">
                      {series.slice(-36).map((p) => (
                        <div
                          key={p.date}
                          className="group relative flex min-w-0 flex-1 flex-col items-stretch justify-end gap-0.5"
                          title={`${p.date}: ${p.actual} / ${p.expected}`}
                        >
                          <div
                            className="rounded-t-[3px] bg-zinc-900/85 transition-opacity group-hover:opacity-90"
                            style={{
                              height: `${Math.max(3, (p.actual / maxSeries) * 100)}%`,
                            }}
                          />
                          <div
                            className="rounded-t-[3px] bg-emerald-400/75"
                            style={{
                              height: `${Math.max(2, (p.expected / maxSeries) * 100)}%`,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] font-medium text-zinc-400">
                      {t("chartLegend")}
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            {tab === "sources" ? (
              sources.length === 0 ? (
                <EmptyState title={t("sourcesEmpty")} />
              ) : (
                <ul className="divide-y divide-zinc-100" data-testid="target-sources">
                  {sources.map((s) => (
                    <li
                      key={`${s.kind}-${s.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-zinc-900">
                          {s.label || s.kind}
                          <span className="font-medium text-zinc-400">
                            {" "}
                            · {s.ownerName || "—"}
                          </span>
                        </p>
                        <p className="text-[11px] font-medium text-zinc-400">
                          {s.occurredAt
                            ? new Date(s.occurredAt).toLocaleString()
                            : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <p className="text-[13px] font-semibold tabular-nums text-zinc-900">
                          {money(s.amount, s.currency)}
                        </p>
                        {s.bookingId ? (
                          <Button asChild size="sm" variant="secondary">
                            <Link href={routes.booking(s.bookingId)}>
                              {t("openBooking")}
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </section>
        </div>
      )}
    </Screen>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  valueClass,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: typeof Gauge;
  valueClass?: string;
}) {
  return (
    <div className="bg-white px-3.5 py-3.5">
      <div className="flex items-center gap-1.5">
        {Icon ? (
          <Icon className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.75} />
        ) : null}
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          {label}
        </p>
      </div>
      <p
        className={cn(
          "mt-1.5 text-[17px] font-semibold tracking-tight tabular-nums text-zinc-900",
          valueClass,
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[11px] font-medium text-zinc-400">{hint}</p>
      ) : null}
    </div>
  );
}
