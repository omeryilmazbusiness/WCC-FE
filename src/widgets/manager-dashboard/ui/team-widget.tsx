"use client";

import { useTranslations } from "next-intl";
import { AlarmClock, ClipboardList, Kanban, Users, type LucideIcon } from "lucide-react";
import type { TeamMemberStat } from "@/entities/dashboard";
import { cn } from "@/shared/lib/cn";
import { ListRow, PagedList, WidgetCard } from "@/shared/ui";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").concat(parts.length > 1 ? parts[parts.length - 1][0] : "").toUpperCase();
}

function Metric({ icon: Icon, value, label, alert }: { icon: LucideIcon; value: number; label: string; alert?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-11 items-center justify-end gap-1 text-xs font-semibold tabular-nums",
        alert ? "text-rose-600" : "text-zinc-500",
      )}
      title={label}
      aria-label={`${label}: ${value}`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      {value}
    </span>
  );
}

type Props = { members: TeamMemberStat[] };

export function TeamWidget({ members }: Props) {
  const t = useTranslations("manager");

  return (
    <WidgetCard title={t("teamTitle")} icon={Users} tone="indigo" count={members.length} data-testid="manager-team">
      <PagedList
        items={members}
        getKey={(m) => m.id}
        empty={<p className="text-sm font-medium text-zinc-400">{t("teamEmpty")}</p>}
        renderItem={(m) => (
          <ListRow
            title={m.name}
            subtitle={m.role}
            data-testid="team-row"
            leading={
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                {initials(m.name)}
              </span>
            }
            trailing={
              <>
                <Metric icon={Kanban} value={m.leadsHandled} label={t("team.leads")} />
                <Metric icon={ClipboardList} value={m.openTasks} label={t("team.openTasks")} />
                <Metric icon={AlarmClock} value={m.overdueTasks} label={t("team.overdue")} alert={m.overdueTasks > 0} />
              </>
            }
          />
        )}
      />
    </WidgetCard>
  );
}
