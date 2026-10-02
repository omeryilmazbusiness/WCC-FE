"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import type { GuardedRoute } from "@/shared/config/permissions";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import type { NavGroup, NavGroupId } from "../model/nav";
import { useScreenOpener } from "../model/screen-opener";
import type { NavFavorites } from "../model/use-nav-favorites";
import { ActiveDot, NavItemLink } from "./nav-section";
import { LinkPending } from "./link-pending";
import { FOCUS_RING, NavTile } from "./nav-tone";

/** Rail width (76px) + gap; logical inset so RTL opens to the left automatically. */
const POPOUT_INSET = 86;
const VIEWPORT_MARGIN = 12;

type Props = {
  groups: readonly NavGroup[];
  favorites: NavFavorites;
  activeHref: GuardedRoute | undefined;
};

type Tip = { text: string; top: number };
type Flyout = { id: NavGroupId; top: number };

/** Collapsed sidebar: icon tiles with tooltips; groups open as a flyout beside the rail. */
export function SidebarRail({ groups, favorites, activeHref }: Props) {
  const t = useTranslations("nav");
  const openScreen = useScreenOpener();
  const [tip, setTip] = useState<Tip | null>(null);
  const [flyout, setFlyout] = useState<Flyout | null>(null);
  const [seenActive, setSeenActive] = useState(activeHref);
  const triggers = useRef(new Map<NavGroupId, HTMLButtonElement>());
  const closeFlyout = useCallback(() => setFlyout(null), []);

  if (seenActive !== activeHref) {
    setSeenActive(activeHref);
    setFlyout(null);
  }

  const showTip = (e: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>, text: string) => {
    if (flyout) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ text, top: r.top + r.height / 2 });
  };
  const hideTip = () => setTip(null);

  const toggleFlyout = (id: NavGroupId, el: HTMLButtonElement) => {
    setTip(null);
    setFlyout((prev) => (prev?.id === id ? null : { id, top: el.getBoundingClientRect().top }));
  };

  const openGroup = groups.find((g) => g.id === flyout?.id);

  return (
    <nav
      aria-label={t("label")}
      className="flex flex-1 flex-col items-center gap-3 scrollbar-none min-h-0 overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent,black_14px,black_calc(100%-14px),transparent)] py-3"
      data-testid="shell-rail"
      onScroll={() => {
        setTip(null);
        setFlyout(null);
      }}
    >
      <ul className="flex flex-col items-center gap-1" data-testid="shell-rail-favorites">
        {favorites.items.map((item) => {
          const label = t(item.label);
          const active = item.href === activeHref;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch
                onClick={(e) => openScreen(e, item.href)}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                data-testid={`shell-rail-fav-${item.label}`}
                onMouseEnter={(e) => showTip(e, label)}
                onMouseLeave={hideTip}
                onFocus={(e) => showTip(e, label)}
                onBlur={hideTip}
                className={cn(
                  "relative flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-200",
                  FOCUS_RING,
                  active ? "bg-white/[0.1]" : "hover:bg-white/[0.06]",
                )}
              >
                <NavTile tone={item.tone} icon={item.icon} />
                <LinkPending className="absolute end-0.5 top-0.5 h-3 w-3 text-white" />
              </Link>
            </li>
          );
        })}
      </ul>

      <div aria-hidden className="h-px w-8 bg-white/[0.08]" />

      <ul className="flex flex-col items-center gap-1">
        {groups.map((group) => {
          const label = t(`groups.${group.id}`);
          const expanded = flyout?.id === group.id;
          const holdsActive = group.items.some((item) => item.href === activeHref);
          return (
            <li key={group.id}>
              <button
                type="button"
                ref={(el) => {
                  if (el) triggers.current.set(group.id, el);
                  else triggers.current.delete(group.id);
                }}
                aria-label={label}
                aria-expanded={expanded}
                aria-controls={expanded ? "shell-rail-flyout" : undefined}
                data-testid={`shell-rail-group-${group.id}`}
                onClick={(e) => toggleFlyout(group.id, e.currentTarget)}
                onMouseEnter={(e) => showTip(e, label)}
                onMouseLeave={hideTip}
                onFocus={(e) => showTip(e, label)}
                onBlur={hideTip}
                className={cn(
                  "relative flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-200",
                  FOCUS_RING,
                  expanded ? "bg-white/[0.1]" : "hover:bg-white/[0.06]",
                )}
              >
                <span className="relative">
                  <NavTile tone={group.tone} icon={group.icon} />
                  {holdsActive ? <ActiveDot tone={group.tone} /> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {tip && !flyout
        ? createPortal(
            <span
              role="tooltip"
              className="pointer-events-none fixed z-50 -translate-y-1/2 whitespace-nowrap rounded-lg bg-zinc-900 px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg ring-1 ring-white/10"
              style={{ top: tip.top, insetInlineStart: POPOUT_INSET }}
              data-testid="shell-rail-tooltip"
            >
              {tip.text}
            </span>,
            document.body,
          )
        : null}

      {flyout && openGroup
        ? createPortal(
            <RailFlyout
              group={openGroup}
              top={flyout.top}
              favorites={favorites}
              activeHref={activeHref}
              trigger={triggers.current.get(openGroup.id) ?? null}
              onClose={closeFlyout}
            />,
            document.body,
          )
        : null}
    </nav>
  );
}

function RailFlyout({
  group,
  top,
  favorites,
  activeHref,
  trigger,
  onClose,
}: {
  group: NavGroup;
  top: number;
  favorites: NavFavorites;
  activeHref: GuardedRoute | undefined;
  trigger: HTMLButtonElement | null;
  onClose: () => void;
}) {
  const t = useTranslations("nav");
  const ref = useRef<HTMLDivElement>(null);
  const [y, setY] = useState(top);

  useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 0;
    setY(Math.max(VIEWPORT_MARGIN, Math.min(top, window.innerHeight - h - VIEWPORT_MARGIN)));
    ref.current?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
  }, [top, group.id]);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || trigger?.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      onClose();
      trigger?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose, trigger]);

  return (
    <div
      ref={ref}
      id="shell-rail-flyout"
      role="dialog"
      aria-label={t(`groups.${group.id}`)}
      data-testid="shell-rail-flyout"
      className="fixed z-50 w-64 rounded-2xl bg-zinc-900/95 p-2 text-white shadow-2xl shadow-black/40 ring-1 ring-white/10 backdrop-blur-xl"
      style={{ top: y, insetInlineStart: POPOUT_INSET - 2 }}
    >
      <div className="flex items-center gap-3 px-2 pt-1 pb-2">
        <NavTile tone={group.tone} icon={group.icon} />
        <p className="truncate text-[14px] font-semibold tracking-tight text-white">
          {t(`groups.${group.id}`)}
        </p>
      </div>
      <ul className="space-y-0.5">
        {group.items.map((item) => (
          <li key={item.href}>
            <NavItemLink
              item={item}
              label={t(item.label)}
              tone={group.tone}
              active={item.href === activeHref}
              favorites={favorites}
              onNavigate={onClose}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
