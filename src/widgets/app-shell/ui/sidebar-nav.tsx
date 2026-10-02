"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import type { GuardedRoute } from "@/shared/config/permissions";
import { groupOf, type NavGroup } from "../model/nav";
import type { NavFavorites } from "../model/use-nav-favorites";
import { useOpenSection } from "../model/use-open-sections";
import { FavoritesSection } from "./favorites-section";
import { isNavDrag, type NavDrag } from "./nav-drag";
import { NavSection } from "./nav-section";

type Props = {
  groups: readonly NavGroup[];
  favorites: NavFavorites;
  activeHref: GuardedRoute | undefined;
};

/** Expanded sidebar: favorites (drag to add, reorder or remove) above a single-open accordion. */
export function SidebarNav({ groups, favorites, activeHref }: Props) {
  const t = useTranslations("nav");
  const activeIsFavorite = activeHref !== undefined && favorites.has(activeHref);
  const { open, toggle } = useOpenSection(
    activeIsFavorite ? undefined : groupOf(groups, activeHref),
  );
  const [drag, setDrag] = useState<NavDrag | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  /** A dragged favorite is over the sidebar but outside the list: dropping removes it. */
  const [removeArmed, setRemoveArmed] = useState(false);

  const endDrag = useCallback(() => {
    setDrag(null);
    setDropIndex(null);
    setRemoveArmed(false);
  }, []);

  const setListDropIndex = useCallback((i: number | null) => {
    setDropIndex(i);
    if (i !== null) setRemoveArmed(false);
  }, []);

  return (
    <nav
      aria-label={t("label")}
      className="flex flex-1 flex-col gap-3 scrollbar-none min-h-0 overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent,black_14px,black_calc(100%-14px),transparent)] px-2.5 py-3"
      data-testid="shell-nav"
      onDragOver={(e) => {
        if (drag?.origin !== "favorite" || !isNavDrag(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (dropIndex !== null) setDropIndex(null);
        if (!removeArmed) setRemoveArmed(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setRemoveArmed(false);
      }}
      onDrop={(e) => {
        if (drag?.origin !== "favorite") return;
        e.preventDefault();
        const item = favorites.items.find((f) => f.href === drag.href);
        if (item) favorites.remove(item.href, t(item.label));
        endDrag();
      }}
    >
      <FavoritesSection
        favorites={favorites}
        activeHref={activeHref}
        drag={drag}
        dropIndex={dropIndex}
        removeArmed={removeArmed}
        setDropIndex={setListDropIndex}
        setDrag={setDrag}
        endDrag={endDrag}
      />

      <div aria-hidden className="mx-3 h-px bg-white/[0.07]" />

      <div className="flex flex-col gap-0.5">
        {groups.map((group) => (
          <NavSection
            key={group.id}
            group={group}
            expanded={open === group.id}
            showActiveDot={!activeIsFavorite}
            activeHref={activeHref}
            favorites={favorites}
            dragging={drag}
            onToggle={toggle}
            setDrag={setDrag}
            endDrag={endDrag}
          />
        ))}
      </div>
    </nav>
  );
}
