"use client";

import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Activity,
  BadgeAlert,
  Gauge,
  Globe,
  KeyRound,
  Loader2,
  Lock,
  PackageX,
  RefreshCw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Timer,
  TrendingDown,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import {
  CREDENTIAL_KEYS,
  ENVIRONMENT_LOOK,
  INTEGRATION_LOOK,
  SLOW_LATENCY_MS,
  lookToBookRatio,
  type HealthStatus,
  type SupplierDetail,
  type Supplier,
  type SupplierRepository,
} from "@/entities/supplier";
import { SetHealthDialog } from "@/features/supplier-health";
import { cn } from "@/shared/lib/cn";
import { formatDateTime } from "@/shared/lib/format";
import { Button, CopyButton, InfoRow, InfoSection, TONES, useMutationFeedback, type Tone } from "@/shared/ui";

const LIGHTS: { status: HealthStatus; on: string }[] = [
  { status: "down", on: "bg-rose-500 shadow-[0_0_24px_4px_rgba(244,63,94,0.55)]" },
  { status: "degraded", on: "bg-amber-400 shadow-[0_0_24px_4px_rgba(251,191,36,0.55)]" },
  { status: "active", on: "bg-emerald-500 shadow-[0_0_24px_4px_rgba(16,185,129,0.55)]" },
];

type Props = { detail: SupplierDetail; repository: SupplierRepository; canWrite: boolean; onSupplier: (s: Supplier) => void };

export function IntegrationTab({ detail, repository, canWrite, onSupplier }: Props) {
  const t = useTranslations("suppliers");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const [checking, setChecking] = useState(false);
  const [manual, setManual] = useState(false);
  const { supplier: s, metrics: m, credentials } = detail;
  const i = s.integration;
  const h = s.health;
  const integ = INTEGRATION_LOOK[i.type];
  const env = ENVIRONMENT_LOOK[i.environment];
  const canProbe = canWrite && i.type !== "manual" && Boolean(i.apiBaseUrl);
  const none = <span className="text-zinc-400">{t("notSet")}</span>;

  async function probe() {
    setChecking(true);
    try {
      const next = await repository.healthCheck(s.id);
      onSupplier(next);
      if (next.health.status === "active") feedback.success(t("integrationTab.checkOk", { ms: next.health.latencyMs }));
      else feedback.error(new Error(next.health.note || next.health.status), t("integrationTab.checkFailed", { status: t(`health.${next.health.status}`) }));
    } catch (e) {
      feedback.error(e, t("integrationTab.checkError"));
    } finally {
      setChecking(false);
    }
  }

  const kpis: { icon: LucideIcon; tone: Tone; label: string; value: ReactNode; id: string }[] = [
    { icon: Search, tone: "sky", label: t("metrics.searches"), value: m.searches.toLocaleString(locale), id: "searches" },
    { icon: ShoppingBag, tone: "indigo", label: t("metrics.bookings"), value: m.bookings.toLocaleString(locale), id: "bookings" },
    { icon: Gauge, tone: "violet", label: t("metrics.lookToBook"), value: lookToBookRatio(m.searches, m.bookings) ?? "—", id: "l2b" },
    { icon: BadgeAlert, tone: m.errorRatePct >= 5 ? "rose" : m.errorRatePct >= 1 ? "amber" : "emerald", label: t("metrics.errorRate"), value: m.searches ? `${m.errorRatePct}%` : "—", id: "errors" },
    { icon: Timer, tone: m.avgLatencyMs > SLOW_LATENCY_MS ? "rose" : "teal", label: t("metrics.avgLatency"), value: m.avgLatencyMs ? t("latencyMs", { ms: m.avgLatencyMs }) : "—", id: "latency" },
    { icon: TrendingDown, tone: m.failedBookingPct >= 10 ? "rose" : "amber", label: t("metrics.failedBookings"), value: m.bookings + m.errors ? `${m.failedBookingPct}%` : "—", id: "failed" },
    { icon: SlidersHorizontal, tone: "zinc", label: t("metrics.priceChanges"), value: m.priceChanges.toLocaleString(locale), id: "price" },
    { icon: PackageX, tone: "zinc", label: t("metrics.soldOuts"), value: m.soldOuts.toLocaleString(locale), id: "soldout" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <InfoSection icon={Activity} tone="emerald" title={t("integrationTab.health")} data-testid="supplier-health">
          <div className="flex items-center gap-5">
            <div className="flex flex-col gap-2.5 rounded-[26px] bg-zinc-900 p-3 shadow-inner" aria-hidden>
              {LIGHTS.map((l) => (
                <span key={l.status} className={cn("h-9 w-9 rounded-full transition", h.status === l.status ? l.on : "bg-zinc-700/80")} />
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn("text-[22px] font-semibold tracking-tight", TONES[h.status === "active" ? "emerald" : h.status === "degraded" ? "amber" : h.status === "down" ? "rose" : "zinc"].text)} data-testid="supplier-health-status">
                {t(`health.${h.status}`)}
              </p>
              <p className="mt-0.5 text-[13px] font-medium text-zinc-500">{h.latencyMs ? t("latencyMs", { ms: h.latencyMs }) : t("integrationTab.noLatency")}</p>
              <p className="mt-2 text-[12px] text-zinc-400">{h.checkedAt ? t("integrationTab.checkedAt", { at: formatDateTime(h.checkedAt, locale) }) : t("integrationTab.neverChecked")}</p>
              {h.note ? <p className="mt-1.5 line-clamp-2 rounded-xl bg-zinc-50 px-2.5 py-1.5 font-mono text-[11.5px] text-zinc-600">{h.note}</p> : null}
            </div>
          </div>
          {canWrite ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {i.type !== "manual" ? (
                <Button size="sm" disabled={!canProbe || checking} onClick={() => void probe()} data-testid="supplier-health-check" title={!i.apiBaseUrl ? t("integrationTab.needUrl") : undefined}>
                  {checking ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
                  {checking ? t("integrationTab.checking") : t("integrationTab.check")}
                </Button>
              ) : null}
              <Button size="sm" variant="outline" onClick={() => setManual(true)} data-testid="supplier-health-manual">
                {t("integrationTab.setManual")}
              </Button>
            </div>
          ) : null}
          {i.type !== "manual" && !i.apiBaseUrl ? <p className="mt-2 text-[12px] font-medium text-amber-700">{t("integrationTab.needUrl")}</p> : null}
        </InfoSection>

        <InfoSection icon={integ.icon} tone={integ.tone} title={t("integrationTab.connection")} data-testid="supplier-connection">
          <div className="divide-y divide-zinc-100">
            <InfoRow icon={integ.icon} tone={integ.tone} label={t("form.integration.type")} value={t(`integration.${i.type}.label`)} hint={t(`integration.${i.type}.hint`)} />
            {i.type !== "manual" ? (
              <>
                <InfoRow icon={env.icon} tone={env.tone} label={t("form.integration.environment")} value={t(`environment.${i.environment}`)} />
                <InfoRow icon={Globe} tone="sky" dir="ltr" label={t("form.integration.baseUrl")} value={i.apiBaseUrl || none} action={i.apiBaseUrl ? <CopyButton value={i.apiBaseUrl} label={t("overview.copy")} /> : null} />
                <InfoRow icon={Webhook} tone="violet" dir="ltr" label={t("form.integration.webhook")} value={i.webhookUrl || none} action={i.webhookUrl ? <CopyButton value={i.webhookUrl} label={t("overview.copy")} /> : null} />
              </>
            ) : null}
          </div>
          {i.type !== "manual" ? (
            <div className="mt-3 rounded-[22px] border border-zinc-200/70 bg-zinc-50/70 p-3.5" data-testid="supplier-credentials">
              <p className="mb-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-zinc-800">
                <Lock className="h-4 w-4 text-emerald-600" aria-hidden />
                {t("form.integration.credentials")}
                <span className="ms-auto text-[11px] font-medium text-zinc-400">{t("integrationTab.encrypted")}</span>
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {CREDENTIAL_KEYS.map((k) => (
                  <div key={k} className="flex items-center gap-2.5 rounded-2xl bg-white p-2.5 ring-1 ring-inset ring-zinc-200/70">
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", credentials[k] ? TONES.emerald.soft : TONES.zinc.soft)} aria-hidden>
                      <KeyRound className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11.5px] font-medium text-zinc-400">{t(`credential.${k}`)}</p>
                      <p className={cn("truncate font-mono text-[13px] font-semibold", credentials[k] ? "text-zinc-900" : "text-zinc-300")} dir="ltr">
                        {credentials[k] || t("form.integration.notSet")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </InfoSection>
      </div>

      <InfoSection icon={Gauge} tone="violet" title={t("integrationTab.metrics", { days: m.windowDays })} data-testid="supplier-api-metrics">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {kpis.map(({ icon: Icon, tone, label, value, id }) => (
            <div key={id} className={cn("rounded-[22px] bg-gradient-to-br p-3 ring-1 ring-inset ring-zinc-900/[0.04]", TONES[tone].tint)} data-testid={`supplier-metric-${id}`}>
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", TONES[tone].solid)} aria-hidden>
                <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
              </span>
              <p className="mt-2 truncate text-[19px] font-semibold leading-none tabular-nums text-zinc-950">{value}</p>
              <p className="mt-1 truncate text-[11.5px] font-medium text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
      </InfoSection>

      <SetHealthDialog repository={repository} supplier={s} open={manual} onOpenChange={setManual} onSaved={onSupplier} />
    </div>
  );
}
