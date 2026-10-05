"use client";

import { useTranslations } from "next-intl";
import { BadgePercent, CalendarClock, Coins, Mail, Phone, ShieldAlert, Siren, UserRound, Wallet } from "lucide-react";
import { BLOCK_LOOK, PAYMENT_LOOK, PRODUCTS, PRODUCT_LOOK, WARNING_LOOK, bpsToPercent, type Supplier } from "@/entities/supplier";
import { cn } from "@/shared/lib/cn";
import { CopyButton, InfoRow, InfoSection, TONES, infoActionClass } from "@/shared/ui";

export function OverviewTab({ supplier: s }: { supplier: Supplier }) {
  const t = useTranslations("suppliers");
  const none = <span className="text-zinc-400">{t("notSet")}</span>;
  const block = s.availability.reason ? BLOCK_LOOK[s.availability.reason] : null;
  const BlockIcon = block?.icon ?? ShieldAlert;
  const pay = PAYMENT_LOOK[s.finance.paymentModel];

  return (
    <div className="space-y-4">
      {!s.availability.bookable && s.availability.reason ? (
        <div className="flex items-start gap-4 rounded-[26px] bg-gradient-to-br from-rose-50 via-white to-white p-4 ring-1 ring-inset ring-rose-100 sm:p-5" data-testid="supplier-closed-banner">
          <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px]", TONES.rose.gradient)} aria-hidden>
            <BlockIcon className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <p className="text-[16px] font-semibold text-rose-900">{t("closed.title")}</p>
            <p className="mt-0.5 text-[13.5px] font-medium text-rose-800/80">{t(`closed.reason.${s.availability.reason}`)}</p>
          </div>
        </div>
      ) : null}
      {s.availability.warnings.length ? (
        <div className="grid gap-2.5 sm:grid-cols-3">
          {s.availability.warnings.map((w) => {
            const Icon = WARNING_LOOK[w].icon;
            return (
              <div key={w} className="flex items-center gap-3 rounded-[22px] bg-gradient-to-br from-amber-50 via-white to-white p-3.5 ring-1 ring-inset ring-amber-100">
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", TONES.amber.solid)} aria-hidden>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-amber-900">{t(`availability.warning.${w}`)}</p>
                  <p className="text-[12px] text-amber-800/80">{t(`warningHint.${w}`)}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <InfoSection icon={UserRound} tone="violet" title={t("overview.contact")} data-testid="supplier-contact">
          <div className="divide-y divide-zinc-100">
            <InfoRow icon={UserRound} tone="violet" label={t("form.contact.name")} value={s.contactName || none} />
            <InfoRow
              icon={Mail}
              tone="sky"
              dir="ltr"
              label={t("form.contact.email")}
              value={s.contactEmail || none}
              action={
                s.contactEmail ? (
                  <a href={`mailto:${s.contactEmail}`} className={infoActionClass}>
                    {t("overview.email")}
                  </a>
                ) : null
              }
            />
            <InfoRow
              icon={Phone}
              tone="emerald"
              dir="ltr"
              label={t("form.contact.phone")}
              value={s.contactPhone || none}
              action={s.contactPhone ? <CopyButton value={s.contactPhone} label={t("overview.copy")} /> : null}
            />
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-[22px] bg-gradient-to-br from-rose-50 via-white to-white p-3.5 ring-1 ring-inset ring-rose-100" data-testid="supplier-emergency-line">
            <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", TONES.rose.solid)} aria-hidden>
              <Siren className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-rose-700">{t("form.contact.emergency")}</p>
              <p className="truncate text-[17px] font-bold text-zinc-950" dir="ltr">
                {s.emergencyPhone || <span className="text-[14px] font-medium text-zinc-400">{t("notSet")}</span>}
              </p>
            </div>
            {s.emergencyPhone ? (
              <a href={`tel:${s.emergencyPhone.replace(/[^\d+]/g, "")}`} className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-rose-500 px-3.5 text-[13px] font-semibold text-white hover:bg-rose-600">
                <Phone className="h-4 w-4" aria-hidden />
                {t("overview.call")}
              </a>
            ) : null}
          </div>
        </InfoSection>

        <InfoSection icon={Wallet} tone="emerald" title={t("overview.commercial")}>
          <div className="divide-y divide-zinc-100">
            <InfoRow icon={pay.icon} tone={pay.tone} label={t("form.finance.title")} value={t(`payment.${s.finance.paymentModel}.label`)} hint={t(`payment.${s.finance.paymentModel}.hint`)} />
            <InfoRow icon={CalendarClock} tone="indigo" label={t("form.finance.terms")} value={t(`terms.${s.finance.paymentTerms}`)} />
            <InfoRow icon={Coins} tone="amber" label={t("form.finance.currency")} value={s.finance.currency} />
          </div>
        </InfoSection>
      </div>

      <InfoSection icon={BadgePercent} tone="amber" title={t("form.markups.title")} data-testid="supplier-markups">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {PRODUCTS.map((p) => {
            const look = PRODUCT_LOOK[p];
            const Icon = look.icon;
            const bps = s.markups[p] ?? 0;
            return (
              <div key={p} className={cn("rounded-[22px] bg-gradient-to-br p-3 ring-1 ring-inset ring-zinc-900/[0.04]", TONES[look.tone].tint)}>
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-[14px]", bps ? TONES[look.tone].solid : TONES.zinc.soft)} aria-hidden>
                  <Icon className="h-5 w-5" />
                </span>
                <p className={cn("mt-2 text-[20px] font-semibold leading-none tabular-nums", bps ? "text-zinc-950" : "text-zinc-300")}>{bps ? `${bpsToPercent(bps)}%` : "0%"}</p>
                <p className="mt-1 truncate text-[12px] font-medium text-zinc-500">{t(`product.${p}`)}</p>
              </div>
            );
          })}
        </div>
      </InfoSection>
    </div>
  );
}
