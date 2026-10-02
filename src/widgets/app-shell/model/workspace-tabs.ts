/**
 * Workspace tabs: up to MAX_TABS screens kept open side by side. Pure state
 * transitions only (no React, no router) so the rules are unit-testable.
 *
 * Invariant: at most one tab per screen root (e.g. "/customers"); the root is
 * the tab's identity and `href` is where the tab currently is inside that
 * screen ("/customers/42?tab=docs").
 */

export const MAX_TABS = 5;

export type WorkspaceTab = {
  root: string;
  href: string;
  /** Window scroll position remembered when the tab was left. */
  scrollY: number;
};

export type TabsState = {
  tabs: WorkspaceTab[];
  active: string;
};

/** new: added a tab · focus: switched to an open tab · same: already active · replace: limit hit, active tab reused. */
export type OpenOutcome = "new" | "focus" | "same" | "replace";

export function initialTabs(root: string, href: string): TabsState {
  return { tabs: [{ root, href, scrollY: 0 }], active: root };
}

function activeIndex(s: TabsState): number {
  const i = s.tabs.findIndex((t) => t.root === s.active);
  return i < 0 ? 0 : i;
}

/** The URL changed (in-screen navigation, back/forward, typed URL). */
export function syncTabs(s: TabsState, root: string, href: string): TabsState {
  const i = s.tabs.findIndex((t) => t.root === root);
  if (i >= 0) {
    if (s.active === root && s.tabs[i].href === href) return s;
    const tabs = [...s.tabs];
    tabs[i] = { ...tabs[i], href };
    return { tabs, active: root };
  }
  const tabs = [...s.tabs];
  tabs[activeIndex(s)] = { root, href, scrollY: 0 };
  return { tabs, active: root };
}

/** The user asked to open a screen (sidebar, favorites). */
export function openTab(
  s: TabsState,
  root: string,
  href: string,
): { state: TabsState; outcome: OpenOutcome; target: WorkspaceTab } {
  const existing = s.tabs.find((t) => t.root === root);
  if (existing) {
    if (s.active === root) return { state: s, outcome: "same", target: existing };
    return { state: { ...s, active: root }, outcome: "focus", target: existing };
  }
  const tab: WorkspaceTab = { root, href, scrollY: 0 };
  const tabs = [...s.tabs];
  if (tabs.length < MAX_TABS) {
    tabs.splice(activeIndex(s) + 1, 0, tab);
    return { state: { tabs, active: root }, outcome: "new", target: tab };
  }
  tabs[activeIndex(s)] = tab;
  return { state: { tabs, active: root }, outcome: "replace", target: tab };
}

export function activateTab(s: TabsState, root: string): TabsState {
  if (s.active === root || !s.tabs.some((t) => t.root === root)) return s;
  return { ...s, active: root };
}

/** Closing the active tab focuses its right neighbour, else the left one. The last tab stays. */
export function closeTab(s: TabsState, root: string): { state: TabsState; next: WorkspaceTab | null } {
  const i = s.tabs.findIndex((t) => t.root === root);
  if (i < 0 || s.tabs.length === 1) return { state: s, next: null };
  const tabs = s.tabs.filter((t) => t.root !== root);
  if (s.active !== root) return { state: { ...s, tabs }, next: null };
  const next = tabs[Math.min(i, tabs.length - 1)];
  return { state: { tabs, active: next.root }, next };
}

/** `to` is an insertion index in the current list. */
export function moveTab(s: TabsState, from: number, to: number): TabsState {
  if (from < 0 || from >= s.tabs.length || to === from || to === from + 1) return s;
  const tabs = [...s.tabs];
  const [moved] = tabs.splice(from, 1);
  tabs.splice(from < to ? to - 1 : to, 0, moved);
  return { ...s, tabs };
}

export function saveScroll(s: TabsState, root: string, scrollY: number): TabsState {
  const i = s.tabs.findIndex((t) => t.root === root);
  if (i < 0 || s.tabs[i].scrollY === scrollY) return s;
  const tabs = [...s.tabs];
  tabs[i] = { ...tabs[i], scrollY };
  return { ...s, tabs };
}

/** Validates persisted tabs; drops malformed or no-longer-permitted entries. */
export function sanitizeTabs(raw: unknown, canOpen: (root: string) => boolean): TabsState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { tabs?: unknown; active?: unknown };
  if (!Array.isArray(r.tabs)) return null;
  const tabs: WorkspaceTab[] = [];
  for (const item of r.tabs) {
    if (!item || typeof item !== "object") continue;
    const t = item as Record<string, unknown>;
    if (typeof t.root !== "string" || typeof t.href !== "string") continue;
    if (!t.root.startsWith("/") || !t.href.startsWith(t.root) || t.href.startsWith("//")) continue;
    if (!canOpen(t.root) || tabs.some((x) => x.root === t.root)) continue;
    const scrollY = typeof t.scrollY === "number" && t.scrollY >= 0 ? Math.round(t.scrollY) : 0;
    tabs.push({ root: t.root, href: t.href, scrollY });
    if (tabs.length === MAX_TABS) break;
  }
  if (tabs.length === 0) return null;
  const active = tabs.some((t) => t.root === r.active) ? (r.active as string) : tabs[0].root;
  return { tabs, active };
}
