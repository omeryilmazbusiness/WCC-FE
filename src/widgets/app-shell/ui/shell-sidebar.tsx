"use client";

import { PanelLeftClose, PanelLeftOpen, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { avatarUrl } from "@/entities/profile";
import type { GuardedRoute } from "@/shared/config/permissions";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { WCC_LOGO } from "@/shared/config/brand";
import { initials } from "@/shared/lib/avatar";
import { cn } from "@/shared/lib/cn";
import type { NavGroup } from "../model/nav";
import { useScreenOpener } from "../model/screen-opener";
import type { NavFavorites } from "../model/use-nav-favorites";
import { FOCUS_RING } from "./nav-tone";
import { SidebarNav } from "./sidebar-nav";
import { SidebarRail } from "./sidebar-rail";

type Props = {
  collapsed: boolean;
  onToggle: () => void;
  groups: readonly NavGroup[];
  favorites: NavFavorites;
  activeHref: GuardedRoute | undefined;
  securityActive: boolean;
  user: { fullName: string; role: string; avatarVersion?: string | null };
};

/** Dark sidebar frame: brand + collapse control, navigation, signed-in user. */
export function ShellSidebar({
  collapsed,
  onToggle,
  groups,
  favorites,
  activeHref,
  securityActive,
  user,
}: Props) {
  const t = useTranslations("nav");
  const ta = useTranslations("app");
  const openScreen = useScreenOpener();
  const toggleLabel = `${collapsed ? t("expand") : t("collapse")} (Ctrl/⌘ B)`;
  const roleLabel = ta.has(`roles.${user.role}`) ? ta(`roles.${user.role}` as "roles.gm") : user.role;

  return (
    <aside
      data-collapsed={collapsed || undefined}
      data-testid="shell-sidebar"
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden bg-zinc-950 text-white transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        collapsed ? "w-[76px]" : "w-64",
      )}
    >
      <div
        className={cn(
          "relative flex h-14 shrink-0 items-center",
          collapsed ? "justify-center" : "gap-3 ps-4 pe-2",
        )}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={toggleLabel}
            title={toggleLabel}
            aria-expanded={false}
            data-testid="shell-sidebar-toggle"
            className={cn("group/brand relative rounded-[12px]", FOCUS_RING)}
          >
            <BrandMark className="transition-opacity duration-150 group-hover/brand:opacity-0 group-focus-visible/brand:opacity-0" />
            <span className="absolute inset-0 flex items-center justify-center rounded-[12px] bg-white/[0.08] text-white opacity-0 ring-1 ring-inset ring-white/15 transition-opacity duration-150 group-hover/brand:opacity-100 group-focus-visible/brand:opacity-100">
              <PanelLeftOpen className="h-4 w-4 rtl:-scale-x-100" strokeWidth={1.9} />
            </span>
          </button>
        ) : (
          <>
            <BrandMark />
            <div className="min-w-0 flex-1 leading-none">
              <p className="truncate text-[14px] font-semibold tracking-[0.12em] text-white">{ta("shortName")}</p>
              <p className="mt-1.5 truncate text-[10.5px] font-medium tracking-wide text-zinc-400">{ta("name")}</p>
            </div>
            <button
              type="button"
              onClick={onToggle}
              aria-label={toggleLabel}
              title={toggleLabel}
              aria-expanded
              data-testid="shell-sidebar-toggle"
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/[0.08] hover:text-white",
                FOCUS_RING,
              )}
            >
              <PanelLeftClose className="h-[17px] w-[17px] rtl:-scale-x-100" strokeWidth={1.8} />
            </button>
          </>
        )}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-3 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
        />
      </div>

      {collapsed ? (
        <SidebarRail groups={groups} favorites={favorites} activeHref={activeHref} />
      ) : (
        <SidebarNav groups={groups} favorites={favorites} activeHref={activeHref} />
      )}

      <div className={cn("shrink-0 pb-3 pt-2", collapsed ? "px-0" : "px-3")}>
        <Link
          href={routes.security}
          onClick={(e) => openScreen(e, routes.security)}
          aria-current={securityActive ? "page" : undefined}
          aria-label={collapsed ? `${user.fullName} — ${roleLabel} — ${t("security")}` : undefined}
          title={collapsed ? `${user.fullName} · ${roleLabel}` : t("security")}
          data-testid="shell-security-link"
          className={cn(
            "group/user flex items-center transition-[background-color,box-shadow] duration-200",
            FOCUS_RING,
            collapsed
              ? "mx-auto h-12 w-12 justify-center rounded-2xl hover:bg-white/[0.06]"
              : "gap-3 rounded-[18px] p-2 pe-2.5 ring-1 ring-inset ring-white/[0.07]",
            !collapsed && (securityActive ? "bg-white/[0.1] ring-white/[0.12]" : "bg-white/[0.04] hover:bg-white/[0.07]"),
            collapsed && securityActive && "bg-white/[0.1]",
          )}
        >
          <span className="relative shrink-0">
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-white to-zinc-300 text-[12px] font-semibold tracking-wide text-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_12px_-4px_rgba(0,0,0,0.6)]"
            >
              {user.avatarVersion ? (
                // eslint-disable-next-line @next/next/no-img-element -- private, cookie-authenticated image
                <img src={avatarUrl(user.avatarVersion)} alt="" className="h-full w-full object-cover" draggable={false} />
              ) : (
                initials(user.fullName)
              )}
            </span>
            <span aria-hidden className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-[2.5px] ring-zinc-950" />
          </span>
          {collapsed ? null : (
            <>
              <span className="min-w-0 flex-1 leading-none">
                <span className="block truncate text-[13px] font-semibold tracking-tight text-white">{user.fullName}</span>
                <span className="mt-1.5 block truncate text-[11px] font-medium text-zinc-400" data-testid="shell-user-role">
                  {roleLabel}
                </span>
              </span>
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-zinc-400 transition-colors group-hover/user:bg-white/[0.12] group-hover/user:text-white"
                aria-label={t("security")}
                role="img"
              >
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.9} />
              </span>
            </>
          )}
        </Link>
      </div>
    </aside>
  );
}

/** WCC logo on a white app-icon tile (the artwork is drawn for a light background). */
function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-white p-[3px] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_16px_-6px_rgba(0,0,0,0.7)] ring-1 ring-white/20",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static asset, no optimisation needed */}
      <img src={WCC_LOGO} alt="" className="h-full w-full object-contain" draggable={false} />
    </span>
  );
}
