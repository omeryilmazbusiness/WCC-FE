"use client";

import { useLocale, useTranslations } from "next-intl";
import { CalendarCheck2, CalendarRange, CalendarX2, FileText, Globe, MapPin, Timer } from "lucide-react";
import { CONTRACT_WARN_DAYS, type Supplier } from "@/entities/supplier";
import type { DocumentRepository } from "@/entities/document";
import { SupplierDocumentsPanel } from "@/features/supplier-documents";
import { cn } from "@/shared/lib/cn";
import { formatDay } from "@/shared/lib/format";
import { InfoRow, InfoSection, TONES, type Tone } from "@/shared/ui";

type Props = { supplier: Supplier; documents: DocumentRepository; canReadDocs: boolean };

export function ScopeTab({ supplier: s, documents, canReadDocs }: Props) {
  const t = useTranslations("suppliers");
  const locale = useLocale();
  const days = s.contractDaysLeft;
  const tone: Tone = days === null ? "zinc" : days < 0 ? "rose" : days <= CONTRACT_WARN_DAYS ? "amber" : "emerald";
  const ContractIcon = days !== null && days < 0 ? CalendarX2 : CalendarCheck2;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <InfoSection icon={Globe} tone="teal" title={t("scopeTab.coverage")} data-testid="supplier-regions">
          {s.regions.length ? (
            <div className="flex flex-wrap gap-2">
              {s.regions.map((r) => (
                <span key={r} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold", TONES.teal.soft)}>
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {t(`region.${r}`)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-zinc-400">{t("scopeTab.noRegions")}</p>
          )}
          <div className="mt-4 divide-y divide-zinc-100 border-t border-zinc-100 pt-3">
            <InfoRow
              icon={Timer}
              tone="sky"
              label={t("form.scope.freeCancel")}
              value={s.freeCancelHours ? t("scopeTab.freeCancel", { h: s.freeCancelHours }) : t("scopeTab.nonRefundable")}
              hint={t("form.scope.freeCancelHint")}
            />
          </div>
        </InfoSection>

        <InfoSection icon={CalendarRange} tone={tone} title={t("scopeTab.contract")} data-testid="supplier-contract-period">
          <div className={cn("flex items-center gap-4 rounded-[22px] bg-gradient-to-br p-4 ring-1 ring-inset ring-zinc-900/[0.04]", TONES[tone].tint)}>
            <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px]", TONES[tone].gradient)} aria-hidden>
              <ContractIcon className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <p className="text-[20px] font-semibold tracking-tight text-zinc-950">
                {days === null ? t("scopeTab.openEnded") : days < 0 ? t("hero.expired") : t("hero.daysLeft", { n: days })}
              </p>
              <p className="text-[13px] font-medium text-zinc-500">
                {s.contractStart ? formatDay(s.contractStart, locale) : "…"} → {s.contractEnd ? formatDay(s.contractEnd, locale) : "…"}
              </p>
            </div>
          </div>
          {days !== null && days <= CONTRACT_WARN_DAYS ? (
            <p className={cn("mt-3 rounded-2xl px-3.5 py-2.5 text-[13px] font-semibold", days < 0 ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800")} data-testid="supplier-contract-warning">
              {days < 0 ? t("scopeTab.expiredHint") : t("scopeTab.expiringHint", { n: days })}
            </p>
          ) : null}
        </InfoSection>
      </div>

      <InfoSection icon={FileText} tone="zinc" title={t("form.scope.terms")}>
        {s.terms ? <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-zinc-700">{s.terms}</p> : <p className="text-[13px] text-zinc-400">{t("scopeTab.noTerms")}</p>}
      </InfoSection>

      {canReadDocs ? <SupplierDocumentsPanel supplierId={s.id} documents={documents} /> : null}
    </div>
  );
}
