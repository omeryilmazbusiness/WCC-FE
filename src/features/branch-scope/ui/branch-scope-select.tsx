"use client";

import { useLocale, useTranslations } from "next-intl";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { useViewer } from "@/entities/viewer";
import type { SessionBranch } from "@/shared/api/session";
import { usePathname } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui";
import { useActiveBranch } from "../model/active-branch";

function branchName(b: SessionBranch, locale: string): string {
  return (locale === "ar" && b.nameAr) || b.nameEn || b.code;
}

/**
 * Company + branch the page works in. Company-wide viewers switch branches here;
 * the switch is a full navigation to the same screen in the other branch so no
 * screen keeps the previous branch's data.
 */
export function BranchScopeSelect() {
  const t = useTranslations("branchScope");
  const locale = useLocale();
  const viewer = useViewer();
  const rest = usePathname();
  const active = useActiveBranch();
  const ws = viewer.workspace;
  if (!ws || !active) return null;

  const companyName = (locale === "ar" && ws.company.nameAr) || ws.company.nameEn || ws.company.slug;
  const canSwitch = (viewer.scope === "company" || viewer.scope === "global") && ws.branches.length > 1;
  const sorted = [...ws.branches].sort(
    (a, b) => Number(b.kind === "main_center") - Number(a.kind === "main_center") || a.nameEn.localeCompare(b.nameEn),
  );

  function open(b: SessionBranch) {
    if (b.id === active?.id) return;
    const suffix = rest === "/" ? "" : rest;
    window.location.assign(`/${locale}/${ws!.company.slug}/${b.slug}${suffix}${window.location.search}`);
  }

  const label = (
    <>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white">
        <Building2 className="h-3.5 w-3.5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 truncate text-[13px] font-semibold text-zinc-900">{companyName}</span>
      <span className="text-zinc-300" aria-hidden>
        /
      </span>
      <span className="min-w-0 truncate text-[13px] text-zinc-600">{branchName(active, locale)}</span>
      {active.kind === "main_center" ? (
        <span className="hidden shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:inline">
          {t("mainCenter")}
        </span>
      ) : null}
    </>
  );

  if (!canSwitch) {
    return <div className="flex min-w-0 items-center gap-2">{label}</div>;
  }

  return (
    <Popover>
      <PopoverTrigger
        className="flex min-w-0 max-w-[26rem] items-center gap-2 rounded-full py-1 pe-2.5 ps-1 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
        aria-label={t("switchBranch")}
      >
        {label}
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" strokeWidth={1.75} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 rounded-2xl p-1.5">
        <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          {t("branches")}
        </p>
        <ul className="flex flex-col gap-0.5">
          {sorted.map((b) => {
            const selected = b.id === active.id;
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => open(b)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start transition-colors",
                    selected ? "bg-zinc-100" : "hover:bg-zinc-50",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-zinc-900">
                      {branchName(b, locale)}
                    </span>
                    <span className="block truncate text-[11px] text-zinc-400">
                      {b.kind === "main_center" ? t("mainCenter") : t("branch")} · {b.code}
                    </span>
                  </span>
                  {selected ? <Check className="h-4 w-4 shrink-0 text-zinc-900" strokeWidth={2} /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
