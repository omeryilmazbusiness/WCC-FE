"use client";

import { useLocale, useTranslations } from "next-intl";
import { ChevronRight, Users } from "lucide-react";
import { documentKindLook, type MissingDocsRow } from "@/entities/document";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { InitialsAvatar, TONES } from "@/shared/ui";

type Props = { row: MissingDocsRow; kindLabel: (kind: string) => string };

export function customerLabel(row: MissingDocsRow, locale: string): string {
  return (locale === "ar" ? row.customerNameAr || row.customerName : row.customerName || row.customerNameAr) || "";
}

/** One booking with its missing required documents; the whole card opens the booking. */
export function MissingRow({ row, kindLabel }: Props) {
  const t = useTranslations("missingDocs");
  const tStatus = useTranslations("bookings.status");
  const locale = useLocale();
  const name = customerLabel(row, locale) || t("row.unknownCustomer");
  const ref = row.refCode || row.bookingId.slice(0, 8);
  const status = row.bookingStatus && tStatus.has(row.bookingStatus) ? tStatus(row.bookingStatus) : row.bookingStatus;

  return (
    <li data-testid="md-row">
      <Link
        href={routes.booking(row.bookingId)}
        className="group flex items-center gap-3.5 rounded-[22px] bg-white px-4 py-3.5 ring-1 ring-inset ring-zinc-900/[0.06] transition-all hover:-translate-y-px hover:shadow-[0_14px_30px_-22px_rgba(15,23,42,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        aria-label={t("row.open", { ref, name, count: row.missingKinds.length })}
      >
        <InitialsAvatar id={row.customerId || row.bookingId} name={name} size="md" className="h-12 w-12 text-[14px]" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="truncate text-[15px] font-semibold tracking-tight text-zinc-950">{name}</p>
            <span className="text-[12px] font-medium text-zinc-400">
              <bdi dir="ltr">{ref}</bdi>
            </span>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-zinc-500">
            {status ? <span>{status}</span> : null}
            {row.paxCount > 0 ? (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" aria-hidden />
                {t("row.travellers", { count: row.paxCount, formatted: formatNumber(row.paxCount, locale) })}
              </span>
            ) : null}
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t("row.missingList")}>
            {row.missingKinds.map((kind) => {
              const look = documentKindLook(kind);
              const Icon = look.icon;
              return (
                <li
                  key={kind}
                  className={cn("flex h-7 items-center gap-1.5 rounded-full ps-1 pe-2.5 text-[12px] font-semibold", TONES[look.tone].soft)}
                >
                  <span className={cn("flex h-5 w-5 items-center justify-center rounded-full", TONES[look.tone].solid)} aria-hidden>
                    <Icon className="h-3 w-3" strokeWidth={2.4} />
                  </span>
                  {kindLabel(kind)}
                </li>
              );
            })}
          </ul>
        </div>
        <span
          className={cn(
            "flex h-10 min-w-10 shrink-0 items-center justify-center rounded-2xl px-2 text-[15px] font-bold tabular-nums",
            row.missingKinds.length >= 3 ? TONES.rose.soft : TONES.amber.soft,
          )}
          aria-hidden
        >
          {formatNumber(row.missingKinds.length, locale)}
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-500 rtl:rotate-180" aria-hidden />
      </Link>
    </li>
  );
}
