"use client";

import { Building2, PanelLeftClose, PanelLeftOpen, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { GuardedRoute } from "@/shared/config/permissions";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
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
  user: { fullName: string; role: string };
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
          "flex h-12 shrink-0 items-center border-b border-white/10",
          collapsed ? "justify-center" : "gap-2.5 ps-4 pe-2",
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
            className={cn(
              "group/brand relative flex h-8 w-8 items-center justify-center rounded-xl bg-white text-zinc-950 shadow-sm",
              FOCUS_RING,
            )}
          >
            <Building2
              className="h-4 w-4 transition-opacity duration-150 group-hover/brand:opacity-0 group-focus-visible/brand:opacity-0"
              strokeWidth={1.75}
            />
            <PanelLeftOpen
              className="absolute h-4 w-4 opacity-0 transition-opacity duration-150 group-hover/brand:opacity-100 group-focus-visible/brand:opacity-100 rtl:-scale-x-100"
              strokeWidth={1.9}
            />
          </button>
        ) : (
          <>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-950 shadow-sm">
              <Building2 className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold tracking-tight">{ta("shortName")}</p>
              <p className="truncate text-[10px] font-medium text-zinc-500">{ta("name")}</p>
            </div>
            <button
              type="button"
              onClick={onToggle}
              aria-label={toggleLabel}
              title={toggleLabel}
              aria-expanded
              data-testid="shell-sidebar-toggle"
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-white/[0.08] hover:text-white",
                FOCUS_RING,
              )}
            >
              <PanelLeftClose className="h-[18px] w-[18px] rtl:-scale-x-100" strokeWidth={1.9} />
            </button>
          </>
        )}
      </div>

      {collapsed ? (
        <SidebarRail groups={groups} favorites={favorites} activeHref={activeHref} />
      ) : (
        <SidebarNav groups={groups} favorites={favorites} activeHref={activeHref} />
      )}

      <Link
        href={routes.security}
        onClick={(e) => openScreen(e, routes.security)}
        aria-current={securityActive ? "page" : undefined}
        aria-label={collapsed ? `${user.fullName} — ${t("security")}` : undefined}
        title={collapsed ? user.fullName : undefined}
        data-testid="shell-security-link"
        className={cn(
          "flex shrink-0 items-center gap-3 border-t border-white/10 py-3 transition-colors",
          collapsed ? "justify-center px-0" : "px-4",
          securityActive ? "bg-white/10" : "hover:bg-white/5",
        )}
      >
        {collapsed ? null : (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-zinc-300">{user.fullName}</p>
            <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              {user.role}
            </p>
          </div>
        )}
        <ShieldCheck
          className="h-4 w-4 shrink-0 text-zinc-500"
          strokeWidth={1.75}
          aria-label={collapsed ? undefined : t("security")}
        />
      </Link>
    </aside>
  );
}
