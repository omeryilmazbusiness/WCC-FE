"use client";

import { useMemo, useState } from "react";
import { Check, Minus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ROLE_LOOK, ROLE_ORDER, fetchPermissionMatrix } from "@/entities/identity";
import type { AppRole } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { GlyphTile, InsetGroup, QueryState, SegmentedControl, TONES } from "@/shared/ui";
import { groupPermissions, humanize } from "../model/permission-groups";

type Show = "all" | "granted";

/** Read-only RBAC matrix, one role at a time, grouped by area like iOS privacy settings. */
export function RolesSection() {
  const t = useTranslations("settings.roles");
  const tRole = useTranslations("team.roles");
  const locale = useLocale();
  const query = useApiQuery(() => fetchPermissionMatrix(), [], { cacheKey: ["permission-matrix"] });
  const matrix = query.data?.permissions;
  const roles = useMemo(() => {
    const known = query.data?.roles ?? [];
    return [...known].sort((a, b) => rank(a) - rank(b));
  }, [query.data]);
  const [picked, setPicked] = useState<AppRole | null>(null);
  const [show, setShow] = useState<Show>("all");
  const role = picked && roles.includes(picked) ? picked : roles[0];

  const all = useMemo(() => Object.values(matrix ?? {}).flat(), [matrix]);
  const groups = useMemo(() => groupPermissions(all, role ? (matrix?.[role] ?? []) : []), [all, matrix, role]);
  const total = groups.reduce((n, g) => n + g.entries.length, 0);
  const granted = groups.reduce((n, g) => n + g.granted, 0);
  const shown = show === "granted" ? groups.filter((g) => g.granted > 0) : groups;
  const label = (key: string, fallback: string) => (t.has(key) ? t(key) : humanize(fallback));

  return (
    <QueryState
      loadingVariant="lines"
      loading={query.loading}
      error={query.error}
      onRetry={() => void query.reload()}
      empty={roles.length === 0}
      emptyTitle={t("empty")}
    >
      <div className="space-y-5" data-testid="roles-section">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label={t("pick")}>
          {roles.map((r) => {
            const look = ROLE_LOOK[r] ?? ROLE_LOOK.employee;
            const Icon = look.icon;
            const active = r === role;
            return (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setPicked(r)}
                data-testid={`roles-pick-${r}`}
                className={cn(
                  "inline-flex h-11 shrink-0 items-center gap-2 rounded-full ps-1.5 pe-4 text-[14px] font-semibold transition-all",
                  active ? "bg-zinc-900 text-white shadow-sm" : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50",
                )}
              >
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", active ? "bg-white/15" : TONES[look.tone].soft)}>
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {tRole.has(r) ? tRole(r) : humanize(r)}
              </button>
            );
          })}
        </div>

        {role ? (
          <div className="flex flex-col gap-4 rounded-[22px] bg-white p-4 ring-1 ring-zinc-200/60 sm:flex-row sm:items-center">
            <GlyphTile icon={(ROLE_LOOK[role] ?? ROLE_LOOK.employee).icon} tone={(ROLE_LOOK[role] ?? ROLE_LOOK.employee).tone} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-semibold text-zinc-950">{tRole.has(role) ? tRole(role) : humanize(role)}</p>
              <p className="text-[13px] text-zinc-500" data-testid="roles-coverage">
                {t("coverage", { granted: formatNumber(granted, locale), total: formatNumber(total, locale) })}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${total ? (granted / total) * 100 : 0}%` }} />
              </div>
            </div>
            <SegmentedControl<Show>
              value={show}
              onChange={setShow}
              aria-label={t("filter")}
              options={[
                { value: "all", label: t("showAll") },
                { value: "granted", label: t("showGranted") },
              ]}
            />
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-2">
          {shown.map((g) => (
            <InsetGroup
              key={g.domain}
              title={
                <span className="flex items-center justify-between gap-2">
                  {label(`domains.${g.domain}`, g.domain)}
                  <span className="normal-case tracking-normal text-zinc-400">
                    {formatNumber(g.granted, locale)}/{formatNumber(g.entries.length, locale)}
                  </span>
                </span>
              }
            >
              {g.entries
                .filter((e) => show === "all" || e.granted)
                .map((e) => (
                  <div key={e.permission} className="flex min-h-[48px] items-center gap-3 px-4 py-2" data-testid="roles-permission">
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-[14.5px]", e.granted ? "text-zinc-950" : "text-zinc-400")}>
                        {label(`actions.${e.action}`, e.action || e.permission)}
                      </span>
                      <span className="block font-mono text-[11px] text-zinc-400" dir="ltr" style={{ textAlign: "start" }}>
                        {e.permission}
                      </span>
                    </span>
                    {e.granted ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white" aria-label={t("granted")}>
                        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                      </span>
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-zinc-400" aria-label={t("notGranted")}>
                        <Minus className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                      </span>
                    )}
                  </div>
                ))}
            </InsetGroup>
          ))}
        </div>
        <p className="px-4 text-[12px] text-zinc-500">{t("footer")}</p>
      </div>
    </QueryState>
  );
}

function rank(role: AppRole): number {
  const i = ROLE_ORDER.indexOf(role);
  return i < 0 ? ROLE_ORDER.length : i;
}
