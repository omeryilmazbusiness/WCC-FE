"use client";

import type { DragEvent } from "react";
import { CircleMinus, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { MAX_NAV_FAVORITES } from "@/entities/ui-preference";
import type { GuardedRoute } from "@/shared/config/permissions";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import type { FavoriteItem, NavTone } from "../model/nav";
import { useScreenOpener } from "../model/screen-opener";
import type { NavFavorites } from "../model/use-nav-favorites";
import { isNavDrag, startNavDrag, type NavDrag } from "./nav-drag";
import { LinkPending } from "./link-pending";
import { FOCUS_RING, NavTile, TONE } from "./nav-tone";

type Props = {
  favorites: NavFavorites;
  activeHref: GuardedRoute | undefined;
  drag: NavDrag | null;
  dropIndex: number | null;
  removeArmed: boolean;
  setDropIndex: (i: number | null) => void;
  setDrag: (d: NavDrag) => void;
  endDrag: () => void;
};

/** Pinned shortcuts: drop target for group items, reorderable, drag out to remove. */
export function FavoritesSection({
  favorites,
  activeHref,
  drag,
  dropIndex,
  removeArmed,
  setDropIndex,
  setDrag,
  endDrag,
}: Props) {
  const t = useTranslations("nav");
  const tf = useTranslations("nav.favorites");
  const incoming = drag?.origin === "group" && !favorites.has(drag.href);
  const blocked = incoming && favorites.isFull;
  const accepting = drag !== null && !blocked;
  const over = dropIndex !== null;
  const removing = drag?.origin === "favorite" && removeArmed;
  const from =
    drag?.origin === "favorite" ? favorites.items.findIndex((f) => f.href === drag.href) : -1;
  const showBar = over && !(from >= 0 && (dropIndex === from || dropIndex === from + 1));

  const indexAt = (e: DragEvent<HTMLUListElement>) => {
    const rows = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[data-fav-row]"));
    const i = rows.findIndex((row) => {
      const r = row.getBoundingClientRect();
      return e.clientY < r.top + r.height / 2;
    });
    return i < 0 ? rows.length : i;
  };

  let hint: string | null = null;
  if (blocked) hint = tf("full", { max: MAX_NAV_FAVORITES });
  else if (removing) hint = tf("dropToRemove");
  else if (incoming) hint = tf("dropToPin");

  return (
    <section
      aria-labelledby="shell-nav-favorites-title"
      className="relative"
      data-testid="shell-nav-favorites"
    >
      <div className="mb-1 flex h-6 items-center gap-2 px-2">
        <h2
          id="shell-nav-favorites-title"
          className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500"
        >
          {tf("title")}
        </h2>
        <span
          className={cn(
            "rounded-full px-1.5 text-[10px] font-semibold tabular-nums transition-colors",
            blocked ? "bg-rose-500/20 text-rose-300" : "bg-white/[0.06] text-zinc-500",
          )}
          data-testid="shell-nav-favorites-count"
        >
          {favorites.items.length}/{MAX_NAV_FAVORITES}
        </span>
        {favorites.isCustomized && drag === null ? (
          <button
            type="button"
            onClick={favorites.reset}
            title={tf("reset")}
            aria-label={tf("reset")}
            data-testid="shell-nav-favorites-reset"
            className={cn(
              "ms-auto flex h-6 w-6 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-white/[0.06] hover:text-zinc-300",
              FOCUS_RING,
            )}
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        ) : null}
      </div>

      <ul
        aria-describedby="shell-nav-favorites-hint"
        data-testid="shell-nav-quick"
        data-drop={blocked ? "blocked" : over ? "over" : accepting ? "ready" : undefined}
        className={cn(
          "relative flex min-h-14 flex-col gap-0.5 rounded-2xl outline-1 outline-offset-2 transition-[outline-color,background-color] duration-200",
          drag === null && "outline-transparent",
          drag !== null && "outline-dashed",
          accepting && !over && "outline-white/15",
          over && "bg-white/[0.03] outline-sky-400/60",
          blocked && "bg-rose-500/[0.04] outline-rose-400/50",
        )}
        onDragOver={(e) => {
          if (!drag || !isNavDrag(e)) return;
          e.stopPropagation();
          if (blocked) {
            e.dataTransfer.dropEffect = "none";
            return;
          }
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          const i = indexAt(e);
          if (i !== dropIndex) setDropIndex(i);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropIndex(null);
        }}
        onDrop={(e) => {
          if (!drag || blocked) return;
          e.preventDefault();
          e.stopPropagation();
          favorites.add(drag.href, indexAt(e));
          endDrag();
        }}
      >
        {favorites.items.map((item, i) => (
          <li key={item.href} data-fav-row className="relative">
            {showBar && dropIndex === i ? <DropBar tone={item.tone} edge="top" /> : null}
            <FavoriteRow
              item={item}
              index={i}
              favorites={favorites}
              active={item.href === activeHref}
              dragging={drag?.origin === "favorite" && drag.href === item.href}
              armedRemove={removing && drag?.href === item.href}
              onDragStart={(e) => {
                startNavDrag(e, { href: item.href, origin: "favorite" }, setDrag);
                setDropIndex(i);
              }}
              onDragEnd={endDrag}
              label={t(item.label)}
            />
            {showBar && dropIndex === favorites.items.length && i === favorites.items.length - 1 ? (
              <DropBar tone={item.tone} edge="bottom" />
            ) : null}
          </li>
        ))}
        {favorites.items.length === 0 ? (
          <li
            className={cn(
              "flex flex-1 items-center justify-center rounded-2xl border border-dashed px-3 py-3 text-center text-[12px] leading-snug transition-colors",
              over ? "border-sky-400/50 text-sky-200" : "border-white/10 text-zinc-500",
            )}
            data-testid="shell-nav-favorites-empty"
          >
            {tf("empty", { max: MAX_NAV_FAVORITES })}
          </li>
        ) : null}
      </ul>

      <p
        id="shell-nav-favorites-hint"
        aria-live="polite"
        className={cn(
          "pointer-events-none absolute inset-x-2 top-full z-10 mt-1 truncate rounded-md bg-zinc-950 text-[11px] leading-4 font-medium transition-opacity duration-200",
          hint ? "opacity-100" : "opacity-0",
          blocked || removing ? "text-rose-300" : "text-sky-300",
        )}
        data-testid="shell-nav-favorites-hint"
      >
        {hint ?? tf("dragHint")}
      </p>
    </section>
  );
}

function DropBar({ tone, edge }: { tone: NavTone; edge: "top" | "bottom" }) {
  return (
    <span
      aria-hidden
      data-testid="shell-nav-drop-indicator"
      className={cn(
        "pointer-events-none absolute inset-x-3 z-10 h-0.5 rounded-full",
        edge === "top" ? "-top-[2px]" : "-bottom-[2px]",
        TONE[tone].dot,
      )}
    />
  );
}

function FavoriteRow({
  item,
  index,
  label,
  favorites,
  active,
  dragging,
  armedRemove,
  onDragStart,
  onDragEnd,
}: {
  item: FavoriteItem;
  index: number;
  label: string;
  favorites: NavFavorites;
  active: boolean;
  dragging: boolean;
  armedRemove: boolean;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: () => void;
}) {
  const tf = useTranslations("nav.favorites");
  const openScreen = useScreenOpener();
  return (
    <div className="group/fav relative">
      <Link
        href={item.href}
        prefetch
        draggable
        onClick={(e) => openScreen(e, item.href)}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onKeyDown={(e) => {
          if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
          e.preventDefault();
          favorites.move(item.href, e.key === "ArrowUp" ? index - 1 : index + 2);
        }}
        aria-current={active ? "page" : undefined}
        aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
        data-testid={`shell-nav-fav-${item.label}`}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-2xl px-2 py-1.5 pe-9 text-[14px] font-semibold tracking-tight transition-[background-color,color,opacity] duration-200 active:cursor-grabbing",
          FOCUS_RING,
          active
            ? "bg-white/[0.09] text-white"
            : "text-zinc-300 hover:bg-white/[0.06] hover:text-white",
          dragging && "opacity-40",
          armedRemove && "bg-rose-500/10 text-rose-200",
        )}
      >
        <NavTile tone={item.tone} icon={item.icon} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <LinkPending />
        {active ? (
          <span
            aria-hidden
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-opacity group-focus-within/fav:opacity-0 group-hover/fav:opacity-0",
              TONE[item.tone].dot,
            )}
          />
        ) : null}
      </Link>
      <button
        type="button"
        onClick={() => favorites.remove(item.href, label)}
        title={tf("unpin")}
        aria-label={`${tf("unpin")}: ${label}`}
        data-testid={`shell-nav-unpin-${item.label}`}
        className={cn(
          "absolute end-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-zinc-500 opacity-0 transition-all duration-200 hover:bg-rose-500/15 hover:text-rose-300 focus-visible:opacity-100 group-hover/fav:opacity-100",
          FOCUS_RING,
        )}
      >
        <CircleMinus className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
