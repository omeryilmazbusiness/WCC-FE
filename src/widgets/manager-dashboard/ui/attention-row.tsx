"use client";

import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { attentionHref, type AttentionItem } from "@/entities/dashboard";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { TONES } from "@/shared/ui";
import { hoursSince, lookFor } from "./attention-look";

type Props = {
  item: AttentionItem;
  locale: string;
  /** Localized kind name. */
  kindLabel: string;
  /** Short relative duration for a number of hours ("5h", "3d"). */
  age: (hours: number) => string;
};

function money(minor: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);
  } catch {
    return `${Math.round(minor / 100).toLocaleString(locale)} ${currency}`;
  }
}

/** One open exception: what it is, who it is about, the number that matters and how long it has waited. */
export function AttentionRow({ item, locale, kindLabel, age }: Props) {
  const t = useTranslations("manager.attention");
  const look = lookFor(item.kind);
  const Icon = look.icon;
  const urgent = item.severity === "high";
  const subtitle = [item.context, kindLabel].filter(Boolean).join(" · ");

  return (
    <Link
      href={attentionHref(item)}
      data-testid="attention-row"
      data-kind={item.kind}
      className="group flex h-full items-center gap-3.5 rounded-[20px] px-2.5 transition-colors hover:bg-zinc-50/90 focus-visible:bg-zinc-50 focus-visible:outline-none"
    >
      <span className={cn("relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", TONES[look.tone].gradient, "shadow-[0_6px_12px_-6px_rgba(15,23,42,0.28)]")}>
        <Icon className="h-5 w-5" strokeWidth={2.1} />
        {urgent ? (
          <span className="absolute -end-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-rose-500" aria-hidden />
        ) : null}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p dir="auto" className="truncate text-[14px] font-semibold tracking-tight text-zinc-900">
            {item.title}
          </p>
          {urgent ? (
            <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10.5px] font-semibold text-rose-700">
              {t("urgent")}
            </span>
          ) : null}
        </div>
        <p className="truncate text-[12px] font-medium text-zinc-500">{subtitle}</p>
      </div>

      <Detail item={item} locale={locale} age={age} />

      <ChevronRight
        className="h-4 w-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
        strokeWidth={2}
      />
    </Link>
  );
}

function Detail({ item, locale, age }: Omit<Props, "kindLabel">) {
  const t = useTranslations("manager.attention");

  if (item.kind === "unpaid_booking" && item.amount !== null && item.currency) {
    return (
      <div className="shrink-0 text-end">
        <p className="text-[13px] font-semibold tabular-nums text-zinc-900">{money(item.amount, item.currency, locale)}</p>
        <p className="text-[11px] font-medium text-zinc-400">{dueText(item, age, t) ?? t("balance")}</p>
      </div>
    );
  }

  if (item.kind === "capacity" && item.capacityTotal) {
    const sold = item.capacitySold ?? 0;
    const pct = Math.min(100, Math.round((sold * 100) / item.capacityTotal));
    return (
      <div className="w-20 shrink-0 text-end">
        <p className="text-[13px] font-semibold tabular-nums text-zinc-900">
          {t("seats", { sold, total: item.capacityTotal })}
        </p>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div className={cn("h-full rounded-full", pct >= 100 ? TONES.rose.dot : TONES.sky.dot)} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  const due = dueText(item, age, t);
  return (
    <div className="shrink-0 text-end">
      <p className={cn("text-[12px] font-semibold tabular-nums", due && isOverdue(item) ? "text-rose-600" : "text-zinc-500")}>
        {due ?? t("waiting", { age: age(item.ageHours) })}
      </p>
    </div>
  );
}

function isOverdue(item: AttentionItem): boolean {
  return item.dueAt !== null && hoursSince(item.dueAt) > 0;
}

function dueText(
  item: AttentionItem,
  age: (hours: number) => string,
  t: ReturnType<typeof useTranslations<"manager.attention">>,
): string | null {
  if (!item.dueAt) return null;
  const hours = hoursSince(item.dueAt);
  return hours > 0 ? t("overdueBy", { age: age(hours) }) : t("dueIn", { age: age(Math.max(1, -hours)) });
}
