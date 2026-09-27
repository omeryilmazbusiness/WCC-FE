"use client";

import { useTranslations } from "next-intl";
import {
  AlarmClock,
  AlertTriangle,
  Flame,
  FileWarning,
  Gauge,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { AttentionItem } from "@/entities/dashboard";
import { routes } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import { ListRow, PagedList, TONES, WidgetCard, type Tone } from "@/shared/ui";

type KindLook = { icon: LucideIcon; tone: Tone };

const KIND_LOOK: Record<string, KindLook> = {
  overdue_task: { icon: AlarmClock, tone: "amber" },
  escalated_task: { icon: Flame, tone: "rose" },
  unpaid_booking: { icon: Wallet, tone: "rose" },
  missing_doc: { icon: FileWarning, tone: "violet" },
  capacity: { icon: Gauge, tone: "sky" },
};

const HINT_HREF: Record<string, string> = {
  bookings: routes.bookings,
  packages: routes.packages,
  pipeline: routes.pipeline,
  tasks: routes.tasks,
};

function metaFor(item: AttentionItem): KindLook & { href: string } {
  const look = KIND_LOOK[item.kind] ?? { icon: AlertTriangle, tone: "zinc" };
  return { ...look, href: HINT_HREF[item.hrefHint] ?? routes.tasks };
}

const SEVERITY_DOT: Record<string, string> = {
  high: TONES.rose.dot,
  medium: TONES.amber.dot,
  low: TONES.zinc.dot,
};

type Props = { items: AttentionItem[] };

export function AttentionWidget({ items }: Props) {
  const t = useTranslations("manager");

  function kindLabel(kind: string): string {
    return t.has(`attentionKinds.${kind}`) ? t(`attentionKinds.${kind}` as "attentionKinds.overdue_task") : kind;
  }

  function age(hours: number): string {
    return hours >= 48 ? t("ageDays", { count: Math.floor(hours / 24) }) : t("ageHours", { count: hours });
  }

  return (
    <WidgetCard
      title={t("attentionTitle")}
      icon={AlertTriangle}
      tone="amber"
      count={items.length}
      href={routes.notifications}
      hrefLabel={t("seeAll")}
      data-testid="manager-attention"
    >
      <PagedList
        items={items}
        getKey={(item) => `${item.kind}-${item.id}`}
        empty={<p className="text-sm font-medium text-zinc-400">{t("attentionEmpty")}</p>}
        renderItem={(item) => {
          const meta = metaFor(item);
          return (
            <ListRow
              href={meta.href}
              icon={meta.icon}
              tone={meta.tone}
              title={item.title}
              subtitle={kindLabel(item.kind)}
              data-testid="attention-row"
              trailing={
                <>
                  <span className="text-xs font-semibold tabular-nums text-zinc-400">{age(item.ageHours)}</span>
                  <span
                    className={cn("h-2.5 w-2.5 rounded-full", SEVERITY_DOT[item.severity] ?? TONES.zinc.dot)}
                    title={item.severity}
                    aria-label={item.severity}
                  />
                </>
              }
            />
          );
        }}
      />
    </WidgetCard>
  );
}
