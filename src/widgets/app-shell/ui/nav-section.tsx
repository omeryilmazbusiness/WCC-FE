"use client";

import { memo, type DragEvent } from "react";
import { ChevronDown, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { MAX_NAV_FAVORITES } from "@/entities/ui-preference";
import type { GuardedRoute } from "@/shared/config/permissions";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import type { NavGroup, NavItem, NavTone } from "../model/nav";
import { useScreenOpener } from "../model/screen-opener";
import type { NavFavorites } from "../model/use-nav-favorites";
import { startNavDrag, type NavDrag } from "./nav-drag";
import { FOCUS_RING, NavTile, TONE } from "./nav-tone";

type SectionProps = {
  group: NavGroup;
  expanded: boolean;
  showActiveDot: boolean;
  activeHref: GuardedRoute | undefined;
  favorites: NavFavorites;
  dragging: NavDrag | null;
  onToggle: (id: NavGroup["id"]) => void;
  setDrag: (d: NavDrag) => void;
  endDrag: () => void;
};

/** One accordion group of the expanded sidebar. */
export const NavSection = memo(function NavSection({
  group,
  expanded,
  showActiveDot,
  activeHref,
  favorites,
  dragging,
  onToggle,
  setDrag,
  endDrag,
}: SectionProps) {
  const t = useTranslations("nav");
  const holdsActive = group.items.some((item) => item.href === activeHref);
  const panelId = `shell-nav-${group.id}`;
  return (
    <section data-testid={`shell-nav-group-${group.id}`}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => onToggle(group.id)}
        data-testid={`shell-nav-toggle-${group.id}`}
        className={cn(
          "group flex w-full items-center gap-3 rounded-2xl px-2 py-1.5 text-start transition-colors duration-200 hover:bg-white/[0.06]",
          FOCUS_RING,
        )}
      >
        <span className="relative">
          <NavTile tone={group.tone} icon={group.icon} />
          {holdsActive && showActiveDot && !expanded ? <ActiveDot tone={group.tone} /> : null}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[14px] font-semibold tracking-tight transition-colors",
            expanded || (holdsActive && showActiveDot)
              ? "text-white"
              : "text-zinc-300 group-hover:text-white",
          )}
        >
          {t(`groups.${group.id}`)}
        </span>
        <ChevronDown
          aria-hidden
          strokeWidth={2}
          className={cn(
            "h-4 w-4 shrink-0 text-zinc-600 transition-transform duration-300 group-hover:text-zinc-400",
            expanded && "rotate-180 text-zinc-400",
          )}
        />
      </button>

      <div
        id={panelId}
        inert={!expanded}
        className={cn(
          "grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-out",
          expanded ? "visible grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <ul className="space-y-0.5 pt-0.5 pb-2 ps-12">
            {group.items.map((item) => (
              <li key={item.href}>
                <NavItemLink
                  item={item}
                  label={t(item.label)}
                  tone={group.tone}
                  active={item.href === activeHref}
                  favorites={favorites}
                  dragging={dragging?.origin === "group" && dragging.href === item.href}
                  onDragStart={(e) => startNavDrag(e, { href: item.href, origin: "group" }, setDrag)}
                  onDragEnd={endDrag}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
});

export function ActiveDot({ tone }: { tone: NavTone }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute -end-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-zinc-950",
        TONE[tone].dot,
      )}
    />
  );
}

type ItemProps = {
  item: NavItem;
  label: string;
  tone: NavTone;
  active: boolean;
  favorites: NavFavorites;
  dragging?: boolean;
  onDragStart?: (e: DragEvent) => void;
  onDragEnd?: () => void;
  /** Runs after the screen opens (e.g. close a flyout). */
  onNavigate?: () => void;
};

/** Screen link with a pin toggle; draggable into favorites when drag handlers are given. */
export function NavItemLink({
  item,
  label,
  tone,
  active,
  favorites,
  dragging = false,
  onDragStart,
  onDragEnd,
  onNavigate,
}: ItemProps) {
  const tf = useTranslations("nav.favorites");
  const openScreen = useScreenOpener();
  const Icon = item.icon;
  const pinned = favorites.has(item.href);
  const full = !pinned && favorites.isFull;
  return (
    <div className="group/item relative">
      <Link
        href={item.href}
        draggable={Boolean(onDragStart)}
        onClick={(e) => {
          openScreen(e, item.href);
          onNavigate?.();
        }}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        aria-current={active ? "page" : undefined}
        data-testid={`shell-nav-link-${item.label}`}
        className={cn(
          "flex h-10 items-center gap-3 rounded-xl px-3 pe-9 text-[13.5px] transition-[background-color,color,opacity] duration-200",
          onDragStart && "active:cursor-grabbing",
          FOCUS_RING,
          active
            ? "bg-white/[0.09] font-semibold text-white"
            : "font-medium text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100",
          dragging && "opacity-40",
        )}
      >
        <Icon className={cn("h-5 w-5 shrink-0", TONE[tone].glyph)} strokeWidth={1.9} />
        <span className="truncate">{label}</span>
      </Link>
      <button
        type="button"
        aria-pressed={pinned}
        aria-disabled={full || undefined}
        onClick={() => (pinned ? favorites.remove(item.href, label) : favorites.add(item.href))}
        title={pinned ? tf("unpin") : full ? tf("full", { max: MAX_NAV_FAVORITES }) : tf("pin")}
        aria-label={`${pinned ? tf("unpin") : tf("pin")}: ${label}`}
        data-testid={`shell-nav-pin-${item.label}`}
        className={cn(
          "absolute end-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition-all duration-200",
          FOCUS_RING,
          pinned
            ? "text-amber-300 hover:bg-white/[0.08]"
            : "text-zinc-500 opacity-0 hover:bg-white/[0.08] hover:text-zinc-200 focus-visible:opacity-100 group-hover/item:opacity-100",
          full && "cursor-not-allowed hover:text-zinc-500",
        )}
      >
        <Star className="h-4 w-4" strokeWidth={2} fill={pinned ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
