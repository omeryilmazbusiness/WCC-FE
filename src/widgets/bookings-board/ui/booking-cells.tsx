"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  HoldCountdownBadge,
  ServiceIconTile,
  bookingPartyName,
  bookingSummary,
  collectedPct,
  extraPax,
  stayNights,
  ttlUrgency,
  type Booking,
} from "@/entities/booking";
import { cn } from "@/shared/lib/cn";
import { formatMoney } from "@/shared/lib/format";
import { CopyButton, InitialsAvatar } from "@/shared/ui";

export function RefCell({ booking: b }: { booking: Booking }) {
  const t = useTranslations("bookingWorkspace.list");
  return (
    <div className="min-w-0" dir="ltr">
      <span className="flex items-center gap-0.5 text-[13px] font-semibold text-zinc-950">
        {b.refCode || b.id.slice(0, 8)}
        <CopyButton value={b.refCode || b.id} label={t("copyRef")} />
      </span>
      {b.pnr ? (
        <span className="mt-0.5 inline-flex items-center gap-0.5 rounded-md bg-zinc-100 px-1.5 font-mono text-[11.5px] font-semibold tracking-wider text-zinc-700">
          {b.pnr}
          <CopyButton value={b.pnr} label={t("copyPnr")} className="h-5 w-5" />
        </span>
      ) : (
        <span className="text-[11.5px] text-zinc-400">{t("noPnr")}</span>
      )}
    </div>
  );
}

export function PartyCell({ booking: b, withIcon = true }: { booking: Booking; withIcon?: boolean }) {
  const t = useTranslations("bookingWorkspace.list");
  const locale = useLocale();
  const extra = extraPax(b.paxCount);
  return (
    <div className="flex min-w-0 items-center gap-3">
      {withIcon ? <ServiceIconTile type={b.serviceType} /> : null}
      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold text-zinc-950">
          <bdi>{bookingPartyName(b, locale) || "—"}</bdi>
          {extra > 0 ? <span className="ms-1.5 text-[12px] font-semibold text-zinc-400">({t("pax", { n: extra })})</span> : null}
        </p>
        <RouteLine booking={b} />
      </div>
    </div>
  );
}

export function RouteLine({ booking: b }: { booking: Booking }) {
  const t = useTranslations("bookingWorkspace.list");
  const locale = useLocale();
  const nights = b.summary ? 0 : stayNights(b.info.departDate, b.info.returnDate);
  const summary = bookingSummary(b, locale);
  return (
    <p className="truncate text-[12.5px] text-zinc-500" dir="auto">
      {summary || "—"}
      {nights > 0 ? <span className="text-zinc-400"> ({t("nights", { n: nights })})</span> : null}
    </p>
  );
}

export function TtlCell({ booking: b }: { booking: Booking }) {
  if (b.status !== "option_hold" || !b.holdExpiresAt) return <span className="text-[12px] text-zinc-300">—</span>;
  const urgency = ttlUrgency(b.holdExpiresAt);
  return (
    <HoldCountdownBadge
      expiresAt={b.holdExpiresAt}
      className={cn(urgency === "urgent" && "animate-pulse bg-rose-600 text-white ring-rose-600", urgency === "expired" && "bg-rose-100")}
    />
  );
}

export function FinanceCell({ booking: b }: { booking: Booking }) {
  const t = useTranslations("bookingWorkspace.list");
  const locale = useLocale();
  const pct = collectedPct(b);
  return (
    <div className="min-w-[120px] text-end">
      <p className="text-[13.5px] font-semibold tabular-nums text-zinc-950">{formatMoney(b.totalAmount, locale, b.currency)}</p>
      <div className="ms-auto mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-zinc-100">
        <div className={cn("h-full rounded-full", pct >= 100 ? "bg-emerald-500" : "bg-sky-500")} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-0.5 text-[11.5px] tabular-nums text-zinc-500">{t("collected", { amount: formatMoney(b.collectedAmt, locale, b.currency) })}</p>
    </div>
  );
}

export function AgentCell({ booking: b }: { booking: Booking }) {
  if (!b.info.ownerName) return <span className="text-[12px] text-zinc-300">—</span>;
  return <InitialsAvatar id={b.ownerId} name={b.info.ownerName} />;
}

export function SupplierCell({ booking: b }: { booking: Booking }) {
  const t = useTranslations("bookingWorkspace.supplier");
  return <span className={cn("text-[12.5px] font-semibold", b.supplierSource ? "text-zinc-700" : "text-zinc-300")}>{t(b.supplierSource || "none")}</span>;
}
