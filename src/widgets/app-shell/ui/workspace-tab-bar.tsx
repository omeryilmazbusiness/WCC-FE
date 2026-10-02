"use client";

import { memo, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import { screenMeta, type NavGroup } from "../model/nav";
import type { WorkspaceTabs } from "../model/use-workspace-tabs";
import { MAX_TABS, type WorkspaceTab } from "../model/workspace-tabs";
import { PendingSpinner } from "./link-pending";

const TAB_DRAG_TYPE = "application/x-wcc-tab";

type Props = {
  groups: readonly NavGroup[];
  tabs: WorkspaceTabs;
  /** id of the element the tabs control (the page content). */
  panelId: string;
};

/** Open screens as soft tabs: click to switch, × or middle-click to close, drag to reorder. */
export const WorkspaceTabBar = memo(function WorkspaceTabBar({ groups, tabs, panelId }: Props) {
  const t = useTranslations("tabs");
  const tn = useTranslations("nav");
  const { tabs: list, active } = tabs.state;
  const listRef = useRef<HTMLDivElement>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const closable = list.length > 1;

  const labelOf = (tab: WorkspaceTab) => {
    const meta = screenMeta(groups, tab.root);
    return meta.label ? tn(meta.label) : tab.root.slice(1) || "/";
  };

  const focusTab = (i: number) =>
    listRef.current?.querySelectorAll<HTMLElement>("[role=tab]")[i]?.focus();

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number, tab: WorkspaceTab) => {
    const rtl = document.documentElement.dir === "rtl";
    const next = rtl ? "ArrowLeft" : "ArrowRight";
    const prev = rtl ? "ArrowRight" : "ArrowLeft";
    if (e.key === next) focusTab((i + 1) % list.length);
    else if (e.key === prev) focusTab((i - 1 + list.length) % list.length);
    else if (e.key === "Home") focusTab(0);
    else if (e.key === "End") focusTab(list.length - 1);
    else if ((e.key === "Delete" || e.key === "Backspace") && closable) tabs.close(tab.root);
    else return;
    e.preventDefault();
  };

  const indexAt = (e: DragEvent<HTMLDivElement>) => {
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[data-tab-item]"));
    const rtl = document.documentElement.dir === "rtl";
    const i = items.findIndex((el) => {
      const r = el.getBoundingClientRect();
      const mid = r.left + r.width / 2;
      return rtl ? e.clientX > mid : e.clientX < mid;
    });
    return i < 0 ? items.length : i;
  };

  const showBar = (i: number) =>
    dropAt === i && dragFrom !== null && dropAt !== dragFrom && dropAt !== dragFrom + 1;

  return (
    <div
      className="sticky top-14 z-10 isolate flex h-10 shrink-0 items-center gap-3 border-b border-zinc-950/[0.05] px-5 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-[#F9FAFB]/80 before:backdrop-blur-xl sm:px-8 lg:px-10"
      data-testid="workspace-tabs"
    >
      <div
        ref={listRef}
        role="tablist"
        aria-label={t("label")}
        className="scrollbar-none flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
        onDragOver={(e) => {
          if (dragFrom === null || !e.dataTransfer.types.includes(TAB_DRAG_TYPE)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          const i = indexAt(e);
          if (i !== dropAt) setDropAt(i);
        }}
        onDrop={(e) => {
          if (dragFrom === null) return;
          e.preventDefault();
          tabs.move(dragFrom, indexAt(e));
          setDragFrom(null);
          setDropAt(null);
        }}
      >
        {list.map((tab, i) => {
          const selected = tab.root === active;
          const meta = screenMeta(groups, tab.root);
          const label = labelOf(tab);
          const Icon = meta.icon;
          const pending = tabs.pendingRoot === tab.root;
          return (
            <div
              key={tab.root}
              data-tab-item
              className={cn("group/tab relative shrink-0", dragFrom === i && "opacity-40")}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(TAB_DRAG_TYPE, tab.root);
                e.dataTransfer.effectAllowed = "move";
                setDragFrom(i);
              }}
              onDragEnd={() => {
                setDragFrom(null);
                setDropAt(null);
              }}
            >
              {showBar(i) ? <TabDropBar edge="start" /> : null}
              <button
                type="button"
                role="tab"
                aria-selected={selected}
                aria-busy={pending || undefined}
                aria-controls={panelId}
                tabIndex={selected ? 0 : -1}
                title={label}
                data-testid={`workspace-tab-${tab.root.slice(1).replaceAll("/", "-")}`}
                onClick={() => tabs.activate(tab.root)}
                onAuxClick={(e) => {
                  if (e.button === 1 && closable) {
                    e.preventDefault();
                    tabs.close(tab.root);
                  }
                }}
                onKeyDown={(e) => onKeyDown(e, i, tab)}
                className={cn(
                  "flex h-7 max-w-[11rem] items-center gap-1.5 rounded-[9px] ps-2 text-[12.5px] tracking-tight transition-[background-color,color,box-shadow] duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/15",
                  closable ? "pe-6" : "pe-2.5",
                  selected
                    ? "bg-white font-semibold text-zinc-950 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_0_0.5px_rgba(0,0,0,0.08)]"
                    : "font-medium text-zinc-500 hover:bg-zinc-950/[0.04] hover:text-zinc-900",
                )}
              >
                <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                  <Icon
                    aria-hidden
                    className={cn(
                      "h-3.5 w-3.5 transition-opacity duration-150",
                      selected ? "text-zinc-950" : "text-zinc-400",
                      pending && "opacity-0 delay-150",
                    )}
                    strokeWidth={selected ? 2.1 : 1.9}
                  />
                  <PendingSpinner pending={pending} className="absolute h-3 w-3 text-zinc-500" />
                </span>
                <span className="truncate">{label}</span>
              </button>
              {closable ? (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={t("close", { name: label })}
                  title={t("close", { name: label })}
                  data-testid={`workspace-tab-close-${tab.root.slice(1).replaceAll("/", "-")}`}
                  onClick={() => tabs.close(tab.root)}
                  className={cn(
                    "absolute end-1 top-1/2 flex h-[18px] w-[18px] -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 transition-all duration-150 hover:bg-zinc-950/[0.07] hover:text-zinc-900",
                    selected ? "opacity-100" : "opacity-0 group-hover/tab:opacity-100 group-focus-within/tab:opacity-100",
                  )}
                >
                  <X className="h-3 w-3" strokeWidth={2.4} />
                </button>
              ) : null}
              {i === list.length - 1 && showBar(list.length) ? <TabDropBar edge="end" /> : null}
            </div>
          );
        })}
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums tracking-wide",
          list.length >= MAX_TABS ? "bg-amber-100 text-amber-700" : "text-zinc-400",
        )}
        title={t("count", { count: list.length, max: MAX_TABS })}
        aria-label={t("count", { count: list.length, max: MAX_TABS })}
        data-testid="workspace-tabs-count"
      >
        {list.length}/{MAX_TABS}
      </span>
    </div>
  );
});

function TabDropBar({ edge }: { edge: "start" | "end" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-1 bottom-1 z-10 w-0.5 rounded-full bg-zinc-950",
        edge === "start" ? "-start-[3px]" : "-end-[3px]",
      )}
    />
  );
}
