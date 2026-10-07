"use client";

import { Check, Lock } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { fetchAssistantProtocol, type AssistantProtocol, type ProtocolCapability } from "@/entities/assistant";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { GlyphTile, InsetGroup, QueryState } from "@/shared/ui";
import { humanize } from "../../model/permission-groups";
import { CAPABILITY_LOOK, FALLBACK_LOOK, PIPELINE, RULE_ICON } from "./ai-protocol-look";

/** What WODI AI may do for this viewer, how it answers, and the rules it always follows. */
export function AiProtocolSection() {
  const t = useTranslations("settings.aiProtocol");
  const query = useApiQuery(() => fetchAssistantProtocol(), [], { cacheKey: ["assistant-protocol"] });
  const protocol = query.data;

  return (
    <QueryState loadingVariant="lines" loading={query.loading} error={query.error} onRetry={() => void query.reload()}>
      {protocol ? (
        <div className="space-y-6" data-testid="ai-protocol-section">
          <StatusCard protocol={protocol} />

          <InsetGroup title={t("pipeline.title")} footer={t("pipeline.footer")} data-testid="ai-protocol-pipeline">
            {PIPELINE.map((step, i) => (
              <div key={step.id} className="flex items-start gap-3 px-4 py-3">
                <GlyphTile icon={step.icon} tone={step.tone} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[14.5px] font-medium text-zinc-950">
                    <span className="text-[12px] font-semibold tabular-nums text-zinc-400">{i + 1}</span>
                    {t(`pipeline.steps.${step.id}.title`)}
                  </span>
                  <span className="block text-[13px] leading-snug text-zinc-500">{t(`pipeline.steps.${step.id}.body`)}</span>
                </span>
              </div>
            ))}
          </InsetGroup>

          <div className="grid gap-6 xl:grid-cols-2">
            <InsetGroup title={t("capabilities.title")} footer={t("capabilities.footer")} data-testid="ai-protocol-capabilities">
              {protocol.capabilities
                .filter((c) => c.kind !== "rule")
                .map((c) => (
                  <CapabilityRow key={c.id} capability={c} />
                ))}
            </InsetGroup>

            <InsetGroup title={t("rules.title")} footer={t("rules.footer")} data-testid="ai-protocol-rules">
              {protocol.rules.map((id) => {
                const Icon = RULE_ICON[id] ?? FALLBACK_LOOK.icon;
                return (
                  <div key={id} className="flex items-start gap-3 px-4 py-3" data-testid="ai-protocol-rule" data-rule={id}>
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-medium text-zinc-950">{label(t, `rules.items.${id}.title`, id)}</span>
                      {t.has(`rules.items.${id}.body`) ? (
                        <span className="block text-[13px] leading-snug text-zinc-500">{t(`rules.items.${id}.body`)}</span>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </InsetGroup>
          </div>

          <Limits protocol={protocol} />
        </div>
      ) : null}
    </QueryState>
  );
}

type T = ReturnType<typeof useTranslations<"settings.aiProtocol">>;

function label(t: T, key: string, fallback: string): string {
  return t.has(key) ? t(key) : humanize(fallback);
}

function StatusCard({ protocol }: { protocol: AssistantProtocol }) {
  const t = useTranslations("settings.aiProtocol");
  const locale = useLocale();
  const format = useFormatter();
  const { quota } = protocol;
  const unlimited = quota.limit <= 0;
  const essential = quota.mode === "essential" || !protocol.aiConfigured;
  const resets = quota.resetsAt ? new Date(quota.resetsAt) : null;
  const pct = unlimited ? 0 : Math.min(100, (quota.used / quota.limit) * 100);

  return (
    <div className="rounded-[22px] bg-white p-4 ring-1 ring-zinc-200/60 sm:p-5" data-testid="ai-protocol-status">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[conic-gradient(from_200deg,#7c3aed,#2563eb,#06b6d4,#a855f7,#7c3aed)] text-white shadow-[0_10px_24px_-14px_rgba(124,58,237,0.9)]">
          <span className="h-4 w-4 rounded-full bg-white/90" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[17px] font-semibold text-zinc-950">{t("status.title")}</p>
            <span
              className={cn(
                "inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11.5px] font-semibold",
                essential ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700",
              )}
              data-testid="ai-protocol-mode"
              data-mode={essential ? "essential" : "full"}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", essential ? "bg-amber-500" : "bg-emerald-500")} />
              {essential ? t("status.essential") : t("status.full")}
            </span>
          </div>
          <p className="mt-0.5 text-[13px] leading-snug text-zinc-500">
            {!protocol.aiConfigured ? t("status.notConfigured") : essential ? t("status.quotaReached") : t("status.ready")}
          </p>
        </div>
      </div>

      <div className="mt-4" data-testid="ai-protocol-quota">
        <div className="flex items-baseline justify-between gap-3 text-[13px]">
          <span className="font-medium text-zinc-700">{t("quota.title")}</span>
          <span className="tabular-nums text-zinc-500">
            {unlimited
              ? t("quota.unlimited")
              : t("quota.used", { used: formatNumber(quota.used, locale), limit: formatNumber(quota.limit, locale) })}
          </span>
        </div>
        {!unlimited ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div
              className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-amber-500" : "bg-[#007AFF]")}
              style={{ width: `${pct}%` }}
            />
          </div>
        ) : null}
        <p className="mt-2 text-[12px] leading-snug text-zinc-500">
          {t("quota.hint")}
          {resets && !Number.isNaN(resets.getTime())
            ? ` ${t("quota.resets", { time: format.dateTime(resets, { hour: "2-digit", minute: "2-digit" }) })}`
            : null}
        </p>
      </div>
    </div>
  );
}

function CapabilityRow({ capability: c }: { capability: ProtocolCapability }) {
  const t = useTranslations("settings.aiProtocol");
  const look = CAPABILITY_LOOK[c.id] ?? FALLBACK_LOOK;
  return (
    <div className="flex items-start gap-3 px-4 py-3" data-testid="ai-protocol-capability" data-capability={c.id} data-allowed={c.allowed}>
      <GlyphTile icon={look.icon} tone={c.allowed ? look.tone : "zinc"} />
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[14.5px] font-medium", c.allowed ? "text-zinc-950" : "text-zinc-400")}>
          {label(t, `capabilities.items.${c.id}.title`, c.id)}
        </span>
        {t.has(`capabilities.items.${c.id}.body`) ? (
          <span className="block text-[13px] leading-snug text-zinc-500">{t(`capabilities.items.${c.id}.body`)}</span>
        ) : null}
        <span className="mt-1.5 flex flex-wrap gap-1">
          {c.usesData ? <Tag>{t("capabilities.usesData")}</Tag> : null}
          <Tag>{c.usesModel ? t("capabilities.usesModel") : t("capabilities.noModel")}</Tag>
          {!c.allowed && c.requires.length ? (
            <Tag muted>
              {t("capabilities.needs")}{" "}
              <span className="font-mono" dir="ltr">
                {c.requires.join(", ")}
              </span>
            </Tag>
          ) : null}
        </span>
      </span>
      {c.allowed ? (
        <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white" aria-label={t("capabilities.allowed")}>
          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
        </span>
      ) : (
        <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-400" aria-label={t("capabilities.locked")}>
          <Lock className="h-3 w-3" strokeWidth={2.5} aria-hidden />
        </span>
      )}
    </div>
  );
}

function Tag({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span className={cn("inline-flex h-5 items-center rounded-full px-1.5 text-[11px] font-medium", muted ? "bg-white text-zinc-500 ring-1 ring-zinc-200" : "bg-zinc-100 text-zinc-600")}>
      {children}
    </span>
  );
}

function Limits({ protocol }: { protocol: AssistantProtocol }) {
  const t = useTranslations("settings.aiProtocol");
  const locale = useLocale();
  const { limits } = protocol;
  return (
    <div className="space-y-1 px-4 text-[12px] leading-relaxed text-zinc-500" data-testid="ai-protocol-limits">
      <p>
        {t("limits.body", {
          chars: formatNumber(limits.maxPromptChars, locale),
          turns: formatNumber(limits.historyTurns, locale),
          minutes: formatNumber(limits.cacheMinutes, locale),
        })}
      </p>
      <p className="text-zinc-400">{t("limits.version", { version: protocol.version })}</p>
    </div>
  );
}
