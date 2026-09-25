"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  createReportRepository,
  REPORT_KINDS,
  type ReportFilter,
  type ReportKind,
  type ReportResult,
} from "@/entities/report";
import { Link } from "@/shared/i18n/navigation";
import {
  Button,
  EmptyState,
  PageHeader,
  Screen,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

function metricValue(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "number") {
    if (Math.abs(v) >= 100 && Number.isInteger(v)) {
      // amounts in minor units often end with _amt
      return String(v);
    }
    return String(v);
  }
  return String(v);
}

function severityClass(sev: string) {
  if (sev === "critical") return "text-rose-700";
  if (sev === "warning") return "text-amber-700";
  return "text-zinc-700";
}

export function ReportsBoard() {
  const t = useTranslations("reports");
  const { push } = useToast();
  const repo = useMemo(() => createReportRepository(), []);
  const range = useMemo(() => defaultRange(), []);
  const [kind, setKind] = useState<ReportKind>("sales");
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [channel, setChannel] = useState("");
  const [provider, setProvider] = useState("");
  const [result, setResult] = useState<ReportResult | null>(null);
  const [busy, setBusy] = useState(false);

  const filter = useCallback((): ReportFilter => {
    const f: ReportFilter = { from, to, limit: 200 };
    if (channel.trim()) f.channel = channel.trim();
    if (provider.trim()) f.provider = provider.trim();
    return f;
  }, [from, to, channel, provider]);

  const load = useCallback(
    async (k: ReportKind) => {
      setBusy(true);
      try {
        setResult(await repo.run(k, filter()));
      } catch {
        push({ title: t("loadError"), tone: "error" });
      } finally {
        setBusy(false);
      }
    },
    [repo, filter, push, t],
  );

  useEffect(() => {
    void load(kind);
  }, [kind, load]);

  async function exportCsv() {
    try {
      const blob = await repo.exportCsv(kind, filter());
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${kind}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      push({ title: t("exported"), tone: "success" });
    } catch {
      push({ title: t("exportError"), tone: "error" });
    }
  }

  const columns = result?.columns ?? [];
  const summaryEntries = Object.entries(result?.summary ?? {});

  return (
    <Screen>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void load(kind)}
              disabled={busy}
            >
              {t("refresh")}
            </Button>
            <Button type="button" size="sm" onClick={() => void exportCsv()}>
              {t("export")}
            </Button>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4">
        <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-500">
          {t("from")}
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-500">
          {t("to")}
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-900"
          />
        </label>
        {(kind === "sla" || kind === "integrations") && (
          <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-500">
            {kind === "sla" ? t("channel") : t("provider")}
            <input
              type="text"
              value={kind === "sla" ? channel : provider}
              onChange={(e) =>
                kind === "sla"
                  ? setChannel(e.target.value)
                  : setProvider(e.target.value)
              }
              placeholder={kind === "sla" ? "whatsapp" : "whatsapp"}
              className="h-9 w-36 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-900"
            />
          </label>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9"
          onClick={() => void load(kind)}
        >
          {t("apply")}
        </Button>
      </div>

      <Tabs
        value={kind}
        onValueChange={(v) => setKind(v as ReportKind)}
        className="space-y-4"
      >
        <TabsList className="flex h-auto flex-wrap gap-1 bg-transparent p-0">
          {REPORT_KINDS.map((k) => (
            <TabsTrigger
              key={k}
              value={k}
              className="rounded-xl border border-transparent data-[state=active]:border-zinc-200 data-[state=active]:bg-white"
            >
              {t(`kinds.${k}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        {REPORT_KINDS.map((k) => (
          <TabsContent key={k} value={k} className="space-y-4">
            {summaryEntries.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {summaryEntries.slice(0, 8).map(([key, val]) => (
                  <div
                    key={key}
                    className="rounded-2xl border border-zinc-200/80 bg-white px-4 py-3"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                      {key.replace(/_/g, " ")}
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-950">
                      {metricValue(val)}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {!result || result.rows.length === 0 ? (
              <EmptyState
                title={busy ? t("loading") : t("empty")}
                description={t("emptyHint")}
              />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-zinc-100 bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    <tr>
                      <th className="px-4 py-3">{t("colLabel")}</th>
                      {columns.map((c) => (
                        <th key={c} className="px-3 py-3 whitespace-nowrap">
                          {c.replace(/_/g, " ")}
                        </th>
                      ))}
                      <th className="px-4 py-3">{t("colDrill")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-zinc-50 last:border-0"
                      >
                        <td
                          className={cn(
                            "px-4 py-3 font-semibold",
                            severityClass(row.severity),
                          )}
                        >
                          {row.label}
                        </td>
                        {columns.map((c) => (
                          <td
                            key={c}
                            className="px-3 py-3 tabular-nums text-zinc-600"
                          >
                            {metricValue(row.metrics[c])}
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {row.drilldowns.map((d, i) => (
                              <Link
                                key={`${d.hrefHint}-${i}`}
                                href={d.hrefHint || "/"}
                                className="text-xs font-semibold text-zinc-900 underline-offset-2 hover:underline"
                              >
                                {d.label || t("open")}
                              </Link>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </Screen>
  );
}
