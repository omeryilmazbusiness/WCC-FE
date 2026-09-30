"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BellRing, ShieldCheck } from "lucide-react";
import { ATTENTION_KINDS, type AttentionItem, type AttentionKind, type AttentionSummary } from "@/entities/dashboard";
import { routes } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import { PagedList, TONES, WidgetCard } from "@/shared/ui";
import { lookFor } from "./attention-look";
import { AttentionRow } from "./attention-row";
import { MetricTile } from "./metric-tile";

type Props = {
  items: AttentionItem[];
  summary: AttentionSummary;
  locale: string;
};

/**
 * Open exceptions for the branch: a tile per kind with its true total (tap to
 * filter) above the most urgent rows, each linking to the record to fix.
 */
export function AttentionWidget({ items, summary, locale }: Props) {
  const t = useTranslations("manager.attention");
  const [kind, setKind] = useState<AttentionKind | null>(null);

  const visible = useMemo(() => (kind ? items.filter((it) => it.kind === kind) : items), [items, kind]);
  const total = kind ? summary.kinds[kind] : summary.total;

  function kindLabel(k: string): string {
    return t.has(`kinds.${k}`) ? t(`kinds.${k}` as "kinds.overdue_task") : k;
  }

  function age(hours: number): string {
    return hours >= 48 ? t("ageDays", { count: Math.floor(hours / 24) }) : t("ageHours", { count: Math.max(0, hours) });
  }

  return (
    <WidgetCard
      title={t("title")}
      icon={BellRing}
      tone="amber"
      count={summary.total}
      href={routes.tasks}
      hrefLabel={t("seeAll")}
      actions={
        summary.high > 0 ? (
          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700" data-testid="attention-high">
            {t("urgentCount", { count: summary.high })}
          </span>
        ) : null
      }
      data-testid="manager-attention"
    >
      <div className="grid grid-cols-5 gap-2" role="group" aria-label={t("filter")}>
        {ATTENTION_KINDS.map((k) => {
          const look = lookFor(k);
          const count = summary.kinds[k];
          const active = kind === k;
          return (
            <MetricTile
              key={k}
              icon={look.icon}
              tone={look.tone}
              value={count}
              label={t(`tiles.${k}`)}
              title={kindLabel(k)}
              active={active}
              disabled={count === 0}
              onClick={() => setKind(active ? null : k)}
              data-testid={`attention-tile-${k}`}
            />
          );
        })}
      </div>

      <PagedList
        className="mt-4"
        items={visible}
        resetKey={kind ?? "all"}
        rowHeight={64}
        gap={4}
        getKey={(item) => `${item.kind}-${item.id}`}
        empty={<AllClear filtered={kind !== null} />}
        renderItem={(item) => (
          <AttentionRow item={item} locale={locale} kindLabel={kindLabel(item.kind)} age={age} />
        )}
      />

      {total > visible.length ? (
        <p className="-mt-1 text-center text-[11px] font-medium text-zinc-400" data-testid="attention-truncated">
          {t("showing", { shown: visible.length, total })}
        </p>
      ) : null}
    </WidgetCard>
  );
}

function AllClear({ filtered }: { filtered: boolean }) {
  const t = useTranslations("manager.attention");
  return (
    <div className="flex flex-col items-center gap-3 text-center" data-testid="attention-empty">
      <span className={cn("flex h-14 w-14 items-center justify-center rounded-[20px]", TONES.emerald.gradient)}>
        <ShieldCheck className="h-7 w-7" strokeWidth={2} />
      </span>
      <div className="space-y-0.5">
        <p className="text-[15px] font-semibold text-zinc-900">{t(filtered ? "emptyFiltered" : "empty")}</p>
        <p className="text-[13px] text-zinc-500">{t("emptyHint")}</p>
      </div>
    </div>
  );
}
