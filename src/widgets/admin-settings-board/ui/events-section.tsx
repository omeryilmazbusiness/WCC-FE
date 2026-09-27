"use client";

import { useTranslations } from "next-intl";
import type { AdminConfigRepository } from "@/entities/adminconfig";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { Badge, QueryState } from "@/shared/ui";

/** Read-only canonical event catalog (T-282). */
export function EventsSection({ repo }: { repo: AdminConfigRepository }) {
  const t = useTranslations("adminSettings");
  const query = useApiQuery(() => repo.listEventsCatalog(), [repo]);
  const events = query.data ?? [];
  return (
    <QueryState
      loading={query.loading}
      error={query.error}
      onRetry={() => void query.reload()}
      empty={events.length === 0}
      emptyTitle={t("empty")}
    >
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5" data-testid="events-section">
        <p className="text-xs text-zinc-500">{t("events.hint")}</p>
        <ul className="mt-3 divide-y divide-zinc-100">
          {events.map((ev) => (
            <li key={ev.name} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[13px] font-medium text-zinc-900">{ev.name}</p>
                <p className="text-xs text-zinc-500">{ev.description}</p>
              </div>
              {ev.durable ? (
                <Badge className="normal-case bg-emerald-50 text-emerald-800">{t("events.durable")}</Badge>
              ) : (
                <Badge className="normal-case">{t("events.inProcess")}</Badge>
              )}
              {ev.idempotent ? <Badge className="normal-case bg-zinc-50 text-zinc-500">{t("events.idempotent")}</Badge> : null}
            </li>
          ))}
        </ul>
      </div>
    </QueryState>
  );
}
