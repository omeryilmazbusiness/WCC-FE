"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { canAccessPath } from "@/shared/config/permissions";
import { usePathname, useRouter } from "@/shared/i18n/navigation";
import { useToast } from "@/shared/ui";
import { screenRoot, type NavGroup } from "./nav";
import { restoreScroll } from "./restore-scroll";
import {
  MAX_TABS,
  activateTab,
  closeTab,
  initialTabs,
  moveTab,
  openTab,
  sanitizeTabs,
  saveScroll,
  syncTabs,
  type TabsState,
  type WorkspaceTab,
} from "./workspace-tabs";

export type WorkspaceTabs = {
  state: TabsState;
  /** Sidebar link click: opens or focuses the screen's tab. Modified clicks keep browser behaviour. */
  openFromLink: (e: MouseEvent<HTMLAnchorElement>, href: string) => void;
  activate: (root: string) => void;
  close: (root: string) => void;
  move: (from: number, to: number) => void;
};

type Options = {
  groups: readonly NavGroup[];
  permissions: readonly string[];
  /** Per user, so a shared browser never shows someone else's tabs. */
  storageKey: string;
};

function isPlainClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

/**
 * Open screens as tabs. The URL stays the source of truth: the active tab follows
 * every navigation, switching tabs is a client-side push to the tab's last URL,
 * and scroll position is restored per tab. Persisted per browser tab (sessionStorage).
 */
export function useWorkspaceTabs({ groups, permissions, storageKey }: Options): WorkspaceTabs {
  const t = useTranslations("tabs");
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const href = query ? `${pathname}?${query}` : pathname;
  const root = screenRoot(groups, pathname);

  const [state, setState] = useState<TabsState>(() => initialTabs(root, href));
  const stateRef = useRef(state);
  const restored = useRef(false);
  const pendingScroll = useRef<number | null>(null);
  const cancelScroll = useRef<() => void>(() => {});

  const commit = useCallback(
    (next: TabsState) => {
      if (next === stateRef.current) return;
      stateRef.current = next;
      setState(next);
      try {
        window.sessionStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* storage unavailable (private mode) */
      }
    },
    [storageKey],
  );

  useEffect(() => {
    let base = stateRef.current;
    if (!restored.current) {
      restored.current = true;
      try {
        const saved = sanitizeTabs(
          JSON.parse(window.sessionStorage.getItem(storageKey) ?? "null"),
          (r) => canAccessPath(permissions, r),
        );
        if (saved) base = saved;
      } catch {
        /* corrupt or unavailable storage: start fresh */
      }
    }
    commit(syncTabs(base, root, href));
    const y = pendingScroll.current;
    if (y !== null) {
      pendingScroll.current = null;
      cancelScroll.current();
      cancelScroll.current = restoreScroll(y);
    }
  }, [root, href, commit, permissions, storageKey]);

  useEffect(() => () => cancelScroll.current(), []);

  const rememberScroll = useCallback(() => {
    const s = stateRef.current;
    commit(saveScroll(s, s.active, Math.round(window.scrollY)));
  }, [commit]);

  const goTo = useCallback(
    (tab: WorkspaceTab) => {
      pendingScroll.current = tab.scrollY;
      router.push(tab.href, { scroll: false });
    },
    [router],
  );

  const openFromLink = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, target: string) => {
      if (!isPlainClick(e)) return;
      rememberScroll();
      const res = openTab(stateRef.current, screenRoot(groups, target), target);
      commit(res.state);
      if (res.outcome === "focus") {
        e.preventDefault();
        goTo(res.target);
      } else if (res.outcome === "replace") {
        toast.push({ tone: "info", title: t("limitReplaced", { max: MAX_TABS }) });
      }
    },
    [commit, goTo, groups, rememberScroll, t, toast],
  );

  const activate = useCallback(
    (target: string) => {
      const s = stateRef.current;
      const tab = s.tabs.find((x) => x.root === target);
      if (!tab || s.active === target) return;
      rememberScroll();
      commit(activateTab(stateRef.current, target));
      goTo(tab);
    },
    [commit, goTo, rememberScroll],
  );

  const close = useCallback(
    (target: string) => {
      const res = closeTab(stateRef.current, target);
      commit(res.state);
      if (res.next) goTo(res.next);
    },
    [commit, goTo],
  );

  const move = useCallback(
    (from: number, to: number) => commit(moveTab(stateRef.current, from, to)),
    [commit],
  );

  return useMemo(
    () => ({ state, openFromLink, activate, close, move }),
    [state, openFromLink, activate, close, move],
  );
}
