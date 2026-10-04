"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import {
  TIMELINE_LOOK,
  metaString,
  paymentAmount,
  timelineLook,
  type TimelineItem,
  type TimelineKind,
} from "@/entities/customer";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { localDay } from "@/shared/lib/day";
import { formatDay, formatMoney } from "@/shared/lib/format";
import { IconTile } from "@/shared/ui";

type Props = {
  items: TimelineItem[];
  /** Compact rows without day headers (overview card). */
  compact?: boolean;
  "data-testid"?: string;
};

const dayOf = (iso: string) => localDay(new Date(iso));

function timeOf(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

const STATUS_TONE: Record<string, string> = {
  done: "bg-emerald-50 text-emerald-700",
  completed: "bg-emerald-50 text-emerald-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  approved: "bg-emerald-50 text-emerald-700",
  won: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-rose-50 text-rose-700",
  rejected: "bg-rose-50 text-rose-700",
  lost: "bg-rose-50 text-rose-700",
  open: "bg-sky-50 text-sky-700",
  in_progress: "bg-indigo-50 text-indigo-700",
};

/** Customer activity, newest first, grouped by day. */
export function TimelineList({ items, compact, "data-testid": testId }: Props) {
  const locale = useLocale();
  const groups = useMemo(() => {
    const out: { day: string; items: TimelineItem[] }[] = [];
    for (const item of items) {
      const day = dayOf(item.occurred_at);
      const last = out[out.length - 1];
      if (last?.day === day) last.items.push(item);
      else out.push({ day, items: [item] });
    }
    return out;
  }, [items]);

  if (compact) {
    return (
      <ul className="divide-y divide-zinc-100" data-testid={testId}>
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`}>
            <Entry item={item} locale={locale} compact />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-5" data-testid={testId}>
      {groups.map((g) => (
        <section key={g.day}>
          <h3 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-zinc-400">{formatDay(g.day, locale)}</h3>
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-[24px] border border-zinc-200/60 bg-white px-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            {g.items.map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                <Entry item={item} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Entry({ item, locale, compact }: { item: TimelineItem; locale: string; compact?: boolean }) {
  const t = useTranslations("customers.timeline");
  const look = timelineLook(item.kind);
  const currency = metaString(item, "currency");
  const status = item.status ?? "";

  let title = item.title;
  let detail = "";
  let href: string | null = null;
  if (item.kind === "payment") {
    const amount = paymentAmount(item);
    title = amount !== null && currency ? t("payment", { amount: formatMoney(amount, locale, currency) }) : item.title;
    detail = status ? (t.has(`methods.${status}`) ? t(`methods.${status as "cash"}`) : status) : "";
    const bookingId = metaString(item, "booking_id");
    href = bookingId ? routes.booking(bookingId) : null;
  } else if (item.kind === "booking") {
    title = t("booking", { ref: item.id.slice(0, 8).toUpperCase() });
    const balance = Number(item.meta?.balance);
    if (currency && Number.isFinite(balance) && balance > 0) detail = t("balance", { amount: formatMoney(balance, locale, currency) });
    href = routes.booking(item.id);
  } else if (item.kind === "lead") {
    const source = metaString(item, "source");
    detail = source ? t("source", { source }) : "";
  } else if (item.kind === "document") {
    detail = status ? (t.has(`documentKinds.${status}`) ? t(`documentKinds.${status as "passport"}`) : status) : "";
  }
  const showStatus = status && item.kind !== "payment" && item.kind !== "document";
  const statusLabel = showStatus ? (t.has(`status.${status}`) ? t(`status.${status as "open"}`) : status.replace(/_/g, " ")) : "";

  const body = (
    <div className={cn("flex items-center gap-3", compact ? "py-2.5" : "py-3")}>
      <IconTile icon={look.icon} tone={look.tone} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-start text-[14px] font-semibold text-zinc-900">
          <bdi>{title}</bdi>
        </p>
        <p className="truncate text-[11.5px] font-medium text-zinc-400">
          {[t(`kinds.${item.kind in TIMELINE_LOOK ? (item.kind as TimelineKind) : "other"}`), detail, compact ? formatDay(dayOf(item.occurred_at), locale) : timeOf(item.occurred_at, locale)]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {statusLabel ? (
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize", STATUS_TONE[status] ?? "bg-zinc-100 text-zinc-600")}>
          {statusLabel}
        </span>
      ) : null}
      {href ? <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 rtl:rotate-180" aria-hidden /> : null}
    </div>
  );

  return href ? (
    <Link href={href} className="-mx-2 block rounded-2xl px-2 transition hover:bg-zinc-50">
      {body}
    </Link>
  ) : (
    body
  );
}
