"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import type { GuardedRoute } from "@/shared/config/permissions";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import {
  groupOf,
  type NavGroup,
  type NavItem,
  type NavTone,
  type QuickItem,
  type VisibleNav,
} from "../model/nav";
import { useOpenSection } from "../model/use-open-sections";

const TONE: Record<NavTone, { tile: string; glyph: string; dot: string }> = {
  sky: { tile: "from-sky-400 to-blue-500", glyph: "text-sky-400", dot: "bg-sky-400" },
  violet: {
    tile: "from-violet-400 to-fuchsia-500",
    glyph: "text-violet-400",
    dot: "bg-violet-400",
  },
  emerald: {
    tile: "from-emerald-400 to-teal-500",
    glyph: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  amber: { tile: "from-amber-400 to-orange-500", glyph: "text-amber-400", dot: "bg-amber-400" },
  indigo: { tile: "from-indigo-400 to-blue-600", glyph: "text-indigo-400", dot: "bg-indigo-400" },
  slate: { tile: "from-slate-400 to-slate-600", glyph: "text-slate-300", dot: "bg-slate-300" },
  rose: { tile: "from-rose-400 to-pink-500", glyph: "text-rose-400", dot: "bg-rose-400" },
};

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30";

function Tile({ tone, icon: Icon }: { tone: NavTone; icon: NavItem["icon"] }) {
  return (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br text-white shadow-sm ring-1 ring-white/15",
        TONE[tone].tile,
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
    </span>
  );
}

type Props = {
  nav: VisibleNav;
  activeHref: GuardedRoute | undefined;
};

/** Daily screens as direct rows, the rest in a single-open accordion. */
export function SidebarNav({ nav, activeHref }: Props) {
  const t = useTranslations("nav");
  const { open, toggle } = useOpenSection(groupOf(nav.groups, activeHref));

  return (
    <nav
      aria-label={t("label")}
      className="flex flex-1 flex-col gap-3 overflow-y-auto px-2.5 py-3"
      data-testid="shell-nav"
    >
      {nav.quick.length > 0 ? (
        <ul className="flex flex-col gap-0.5" data-testid="shell-nav-quick">
          {nav.quick.map((item) => (
            <li key={item.href}>
              <QuickRow item={item} label={t(item.label)} active={item.href === activeHref} />
            </li>
          ))}
        </ul>
      ) : null}

      {nav.quick.length > 0 && nav.groups.length > 0 ? (
        <div aria-hidden className="mx-3 h-px bg-white/[0.07]" />
      ) : null}

      <div className="flex flex-col gap-0.5">
        {nav.groups.map((group) => (
          <Section
            key={group.id}
            group={group}
            label={t(`groups.${group.id}`)}
            itemLabel={(item) => t(item.label)}
            expanded={open === group.id}
            activeHref={activeHref}
            onToggle={() => toggle(group.id)}
          />
        ))}
      </div>
    </nav>
  );
}

function QuickRow({ item, label, active }: { item: QuickItem; label: string; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-2 py-1.5 text-[14px] font-semibold tracking-tight transition-colors duration-200",
        FOCUS,
        active
          ? "bg-white/[0.09] text-white"
          : "text-zinc-300 hover:bg-white/[0.06] hover:text-white",
      )}
    >
      <Tile tone={item.tone} icon={item.icon} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {active ? (
        <span aria-hidden className={cn("me-2 h-1.5 w-1.5 rounded-full", TONE[item.tone].dot)} />
      ) : null}
    </Link>
  );
}

function Section({
  group,
  label,
  itemLabel,
  expanded,
  activeHref,
  onToggle,
}: {
  group: NavGroup;
  label: string;
  itemLabel: (item: NavItem) => string;
  expanded: boolean;
  activeHref: GuardedRoute | undefined;
  onToggle: () => void;
}) {
  const holdsActive = group.items.some((item) => item.href === activeHref);
  const panelId = `shell-nav-${group.id}`;
  return (
    <section data-testid={`shell-nav-group-${group.id}`}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        data-testid={`shell-nav-toggle-${group.id}`}
        className={cn(
          "group flex w-full items-center gap-3 rounded-2xl px-2 py-1.5 text-start transition-colors duration-200 hover:bg-white/[0.06]",
          FOCUS,
        )}
      >
        <span className="relative">
          <Tile tone={group.tone} icon={group.icon} />
          {holdsActive && !expanded ? (
            <span
              aria-hidden
              className={cn(
                "absolute -end-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-zinc-950",
                TONE[group.tone].dot,
              )}
            />
          ) : null}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[14px] font-semibold tracking-tight transition-colors",
            expanded || holdsActive ? "text-white" : "text-zinc-300 group-hover:text-white",
          )}
        >
          {label}
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
                <SectionLink
                  item={item}
                  label={itemLabel(item)}
                  tone={group.tone}
                  active={item.href === activeHref}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function SectionLink({
  item,
  label,
  tone,
  active,
}: {
  item: NavItem;
  label: string;
  tone: NavTone;
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 items-center gap-3 rounded-xl px-3 text-[13.5px] transition-colors duration-200",
        FOCUS,
        active
          ? "bg-white/[0.09] font-semibold text-white"
          : "font-medium text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100",
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", TONE[tone].glyph)} strokeWidth={1.9} />
      <span className="truncate">{label}</span>
      {active ? (
        <span aria-hidden className={cn("ms-auto h-1.5 w-1.5 rounded-full", TONE[tone].dot)} />
      ) : null}
    </Link>
  );
}
