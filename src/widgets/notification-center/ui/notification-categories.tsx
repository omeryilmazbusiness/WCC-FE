"use client";

import { useTranslations } from "next-intl";
import { ChevronRight, Layers, type LucideIcon } from "lucide-react";
import { notificationLook, useKindLabel, type NotificationGroup, type NotificationTotals } from "@/entities/notification";
import { cn } from "@/shared/lib/cn";
import { formatRelativeTime } from "@/shared/lib/format";
import { TONES, type Tone } from "@/shared/ui";

type Props = {
  groups: readonly NotificationGroup[];
  totals: NotificationTotals;
  selectedKind: string;
  locale: string;
  onSelect: (kind: string) => void;
};

type Category = {
  kind: string;
  label: string;
  icon: LucideIcon;
  tone: Tone;
  open: number;
  acknowledged: number;
  latestAt?: string;
};

/** Category picker: an inset grouped list on desktop, scrollable chips on small screens. */
export function NotificationCategories({ groups, totals, selectedKind, locale, onSelect }: Props) {
  const t = useTranslations("notificationCenter");
  const kindLabel = useKindLabel();
  const categories: Category[] = [
    { kind: "", label: t("allKinds"), icon: Layers, tone: "zinc", open: totals.open, acknowledged: totals.acknowledged },
    ...[...groups]
      .sort((a, b) => b.open - a.open || b.latestAt.localeCompare(a.latestAt))
      .map((g) => {
        const look = notificationLook(g.kind, g.severity);
        return {
          kind: g.kind,
          label: kindLabel(g.kind, g.title),
          icon: look.icon,
          tone: look.tone,
          open: g.open,
          acknowledged: g.acknowledged,
          latestAt: g.latestAt,
        };
      }),
  ];

  return (
    <>
      <nav
        aria-label={t("groups")}
        className="hidden rounded-[26px] bg-white p-2 ring-1 ring-zinc-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_32px_-28px_rgba(15,23,42,0.4)] lg:block"
        data-testid="notification-categories"
      >
        <p className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{t("categories")}</p>
        <ul className="space-y-0.5">
          {categories.map((c) => {
            const active = c.kind === selectedKind;
            const Icon = c.icon;
            return (
              <li key={c.kind || "all"}>
                <button
                  type="button"
                  onClick={() => onSelect(c.kind)}
                  aria-current={active ? "true" : undefined}
                  data-testid={`notification-category-${c.kind || "all"}`}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-[18px] px-2 py-2 text-start transition-colors",
                    active ? "bg-zinc-100" : "hover:bg-zinc-50",
                  )}
                >
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]", TONES[c.tone].gradient)} aria-hidden>
                    <Icon className="h-5 w-5" strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-[13.5px] text-zinc-900", active ? "font-bold" : "font-semibold")}>{c.label}</span>
                    <span className="block truncate text-[11.5px] text-zinc-400">
                      {c.latestAt ? formatRelativeTime(c.latestAt, locale) : t("count", { count: c.open + c.acknowledged })}
                    </span>
                  </span>
                  <Counts open={c.open} acknowledged={c.acknowledged} locale={locale} />
                  <ChevronRight
                    className={cn("h-4 w-4 shrink-0 text-zinc-300 transition-transform rtl:rotate-180", active && "text-zinc-500")}
                    aria-hidden
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        role="tablist"
        aria-label={t("groups")}
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:hidden"
      >
        {categories.map((c) => {
          const active = c.kind === selectedKind;
          const Icon = c.icon;
          return (
            <button
              key={c.kind || "all"}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(c.kind)}
              className={cn(
                "inline-flex h-11 shrink-0 items-center gap-2 rounded-full ps-1.5 pe-3.5 text-[13px] font-semibold ring-1 ring-inset transition-colors",
                active ? "bg-zinc-950 text-white ring-zinc-950" : "bg-white text-zinc-700 ring-zinc-200/80",
              )}
            >
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", TONES[c.tone].gradient)} aria-hidden>
                <Icon className="h-4 w-4" strokeWidth={2.2} />
              </span>
              {c.label}
              {c.open > 0 ? (
                <span className="rounded-full bg-rose-500 px-1.5 text-[11px] font-bold tabular-nums text-white">
                  {c.open.toLocaleString(locale)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </>
  );
}

function Counts({ open, acknowledged, locale }: { open: number; acknowledged: number; locale: string }) {
  const t = useTranslations("notificationCenter.stats");
  return (
    <span className="flex shrink-0 items-center gap-1">
      {open > 0 ? (
        <span
          className="min-w-[1.375rem] rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums text-white"
          title={t("open")}
        >
          {open.toLocaleString(locale)}
        </span>
      ) : null}
      {acknowledged > 0 ? (
        <span
          className="min-w-[1.375rem] rounded-full bg-zinc-200/70 px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums text-zinc-600"
          title={t("acknowledged")}
        >
          {acknowledged.toLocaleString(locale)}
        </span>
      ) : null}
    </span>
  );
}
