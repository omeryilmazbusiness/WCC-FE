"use client";

import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronsUpDown, Crown, MapPin, ShieldCheck } from "lucide-react";
import { useViewer } from "@/entities/viewer";
import type { SessionBranch } from "@/shared/api/session";
import { usePathname } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui";
import { useActiveBranch } from "../model/active-branch";
import { CompanyMark } from "./company-mark";

const MONOGRAM =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-b from-zinc-800 to-zinc-950 text-[12px] font-semibold tracking-wide text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_6px_14px_-8px_rgba(0,0,0,0.7)]";

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
  if (!ws && viewer.scope === "global") {
    return (
      <div className="flex min-w-0 items-center gap-2.5" data-testid="platform-badge">
        <span className={MONOGRAM}>
          <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
        </span>
        <span className="truncate text-[13.5px] font-semibold tracking-tight text-zinc-950">{t("platform")}</span>
      </div>
    );
  }
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

  const mainCenter = active.kind === "main_center";
  const label = (
    <>
      <CompanyMark slug={ws.company.slug} name={companyName} />
      <span className="flex min-w-0 flex-col items-start leading-none">
        <span className="max-w-full truncate text-[13.5px] font-semibold tracking-tight text-zinc-950" data-testid="scope-company">
          {companyName}
        </span>
        <span className="mt-1 flex min-w-0 max-w-full items-center gap-1 text-[11.5px] font-medium text-zinc-500">
          {mainCenter ? (
            <Crown className="h-3 w-3 shrink-0 text-zinc-950" strokeWidth={2.2} aria-label={t("mainCenter")} role="img" />
          ) : null}
          <span className="truncate" data-testid="scope-branch">
            {branchName(active, locale)}
          </span>
        </span>
      </span>
    </>
  );

  if (!canSwitch) {
    return <div className="flex min-w-0 items-center gap-2.5" data-testid="branch-scope">{label}</div>;
  }

  return (
    <Popover>
      <PopoverTrigger
        className="group/scope -ms-1.5 flex min-w-0 max-w-[26rem] items-center gap-2.5 rounded-[16px] py-1 pe-2 ps-1.5 transition-colors duration-200 hover:bg-zinc-950/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/15 aria-expanded:bg-zinc-950/[0.05]"
        aria-label={t("switchBranch")}
        data-testid="branch-scope"
      >
        {label}
        <span className="ms-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors group-hover/scope:bg-white group-hover/scope:text-zinc-950 group-hover/scope:shadow-[0_1px_2px_rgba(0,0,0,0.08),0_0_0_0.5px_rgba(0,0,0,0.08)]">
          <ChevronsUpDown className="h-3.5 w-3.5" strokeWidth={1.9} />
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[19rem] rounded-[22px] border-white/80 bg-white/95 p-1.5 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] ring-1 ring-zinc-950/[0.06] backdrop-blur-xl"
      >
        <p className="px-3 pb-2 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
          {t("branches")}
        </p>
        <ul className="flex flex-col gap-0.5">
          {sorted.map((b) => {
            const selected = b.id === active.id;
            const main = b.kind === "main_center";
            const Icon = main ? Crown : MapPin;
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => open(b)}
                  aria-current={selected ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[16px] px-2 py-2 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/15",
                    selected ? "bg-zinc-950/[0.05]" : "hover:bg-zinc-950/[0.03]",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]",
                      selected ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-600",
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold tracking-tight text-zinc-950">
                      {branchName(b, locale)}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] font-medium text-zinc-400">
                      {main ? t("mainCenter") : t("branch")} · {b.code}
                    </span>
                  </span>
                  {selected ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white">
                      <Check className="h-3 w-3" strokeWidth={2.6} />
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
