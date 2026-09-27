"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import { diffObjects, formatDiffValue, type DiffKind } from "@/shared/lib/diff-objects";
import { Badge } from "@/shared/ui";
import type { AuditActorType, AuditEvent } from "../model";

const ACTOR_TONE: Record<AuditActorType, string> = {
  user: "bg-sky-50 text-sky-700",
  system: "bg-zinc-100 text-zinc-700",
  webhook: "bg-violet-50 text-violet-700",
};

export function AuditActorTypeBadge({ type }: { type: AuditActorType }) {
  const t = useTranslations("audit.actorType");
  return <Badge className={cn("normal-case", ACTOR_TONE[type])}>{t(type)}</Badge>;
}

const ROW_TONE: Record<DiffKind, string> = {
  added: "bg-emerald-50/70",
  removed: "bg-red-50/70",
  changed: "bg-amber-50/70",
  unchanged: "",
};

const KIND_TONE: Record<Exclude<DiffKind, "unchanged">, string> = {
  added: "bg-emerald-100 text-emerald-800",
  removed: "bg-red-100 text-red-800",
  changed: "bg-amber-100 text-amber-800",
};

/** Expanded audit row: before/after diff, extra payload and request metadata. */
export function AuditEventDetails({ event }: { event: AuditEvent }) {
  const t = useTranslations("audit.details");
  const diff = useMemo(() => diffObjects(event.before, event.after), [event.before, event.after]);
  const hasExtra = Object.keys(event.extra).length > 0;

  return (
    <div className="space-y-5" data-testid="audit-event-details">
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("changes")}</h3>
        {diff.entries.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("noChanges")}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white">
            <table className="w-full text-sm" data-testid="audit-diff-table">
              <thead>
                <tr className="border-b border-zinc-100 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-2 text-start">{t("field")}</th>
                  <th className="px-4 py-2 text-start">{t("before")}</th>
                  <th className="px-4 py-2 text-start">{t("after")}</th>
                </tr>
              </thead>
              <tbody>
                {diff.entries.map((entry) => (
                  <tr
                    key={entry.key}
                    className={cn("border-b border-zinc-100 last:border-0", ROW_TONE[entry.kind])}
                    data-diff-kind={entry.kind}
                  >
                    <td className="px-4 py-2 align-top">
                      <span className="font-mono text-xs text-zinc-800">{entry.key}</span>
                      {entry.kind !== "unchanged" ? (
                        <Badge className={cn("ms-2 px-1.5 py-0.5 text-[10px] normal-case", KIND_TONE[entry.kind])}>
                          {t(entry.kind)}
                        </Badge>
                      ) : null}
                    </td>
                    <DiffCell value={entry.before} struck={entry.kind === "changed" || entry.kind === "removed"} />
                    <DiffCell value={entry.after} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {hasExtra ? (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("extra")}</h3>
          <pre dir="ltr" className="overflow-x-auto rounded-2xl bg-zinc-50 p-3 font-mono text-xs text-zinc-700">
            {JSON.stringify(event.extra, null, 2)}
          </pre>
        </section>
      ) : null}

      <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        <Meta label={t("requestId")} value={event.request_id} />
        <Meta label={t("sessionId")} value={event.session_id} />
        <Meta label={t("entityId")} value={event.entity_id} />
        <Meta label={t("actorId")} value={event.actor_id} />
        <Meta label={t("branchId")} value={event.branch_id} />
        <Meta label={t("userAgent")} value={event.user_agent} className="sm:col-span-2" />
      </dl>
    </div>
  );
}

function DiffCell({ value, struck = false }: { value: unknown; struck?: boolean }) {
  return (
    <td className="max-w-[28rem] px-4 py-2 align-top">
      {value === undefined ? (
        <span className="text-zinc-300">—</span>
      ) : (
        <bdi
          dir="ltr"
          className={cn("break-all font-mono text-xs text-zinc-800", struck && "text-zinc-500 line-through")}
        >
          {formatDiffValue(value)}
        </bdi>
      )}
    </td>
  );
}

function Meta({ label, value, className }: { label: string; value: string | null; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 break-all font-mono text-xs text-zinc-800">
        {value ? <bdi dir="ltr">{value}</bdi> : "—"}
      </dd>
    </div>
  );
}
