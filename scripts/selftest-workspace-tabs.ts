/**
 * Self-test: workspace tab rules (open / focus / limit / close / sync / reorder / restore).
 * Run: npm run test:workspace-tabs
 */

import assert from "node:assert/strict";
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
} from "../src/widgets/app-shell/model/workspace-tabs.ts";

const roots = (s: TabsState) => s.tabs.map((t) => t.root);

// opening new screens adds tabs next to the active one, up to the limit
let s = initialTabs("/manager", "/manager");
let r = openTab(s, "/inbox", "/inbox");
assert.equal(r.outcome, "new");
s = r.state;
assert.deepEqual(roots(s), ["/manager", "/inbox"]);
assert.equal(s.active, "/inbox");

s = activateTab(s, "/manager");
s = openTab(s, "/tasks", "/tasks").state;
assert.deepEqual(roots(s), ["/manager", "/tasks", "/inbox"], "inserted right after the active tab");

s = openTab(s, "/customers", "/customers").state;
s = openTab(s, "/bookings", "/bookings").state;
assert.equal(s.tabs.length, MAX_TABS);

// at the limit the active tab is reused instead of growing past MAX_TABS
r = openTab(s, "/finance", "/finance");
assert.equal(r.outcome, "replace");
assert.equal(r.state.tabs.length, MAX_TABS);
assert.equal(r.state.active, "/finance");
assert.ok(!roots(r.state).includes("/bookings"), "the active tab was replaced");
s = r.state;

// an open screen is focused, never duplicated; the tab keeps where it was
s = syncTabs(s, "/finance", "/finance");
s = activateTab(s, "/customers");
s = syncTabs(s, "/customers", "/customers/42?tab=docs");
s = activateTab(s, "/finance");
r = openTab(s, "/customers", "/customers");
assert.equal(r.outcome, "focus");
assert.equal(r.target.href, "/customers/42?tab=docs");
assert.equal(new Set(roots(r.state)).size, r.state.tabs.length, "one tab per screen");
assert.equal(openTab(r.state, "/customers", "/customers").outcome, "same");
s = r.state;

// URL changes: inside the active screen update it; to another open screen focus it
s = syncTabs(s, "/customers", "/customers/7");
assert.equal(s.tabs.find((t) => t.root === "/customers")?.href, "/customers/7");
s = syncTabs(s, "/manager", "/manager?period=7d");
assert.equal(s.active, "/manager");
assert.equal(s.tabs.find((t) => t.root === "/manager")?.href, "/manager?period=7d");
const before = s.tabs.length;
s = syncTabs(s, "/reports", "/reports");
assert.equal(s.tabs.length, before, "unknown screen replaces the active tab");
assert.equal(s.active, "/reports");
assert.equal(syncTabs(s, "/reports", "/reports"), s, "no-op keeps identity (no re-render)");

// closing: right neighbour first, never the last tab
s = { tabs: [{ root: "/a", href: "/a", scrollY: 0 }, { root: "/b", href: "/b", scrollY: 0 }, { root: "/c", href: "/c", scrollY: 0 }], active: "/b" };
let c = closeTab(s, "/b");
assert.equal(c.next?.root, "/c");
assert.deepEqual(roots(c.state), ["/a", "/c"]);
c = closeTab(c.state, "/c");
assert.equal(c.next?.root, "/a", "closing the rightmost falls back left");
assert.equal(closeTab(c.state, "/a").state, c.state, "last tab cannot be closed");
c = closeTab(s, "/a");
assert.equal(c.next, null, "closing an inactive tab keeps focus");
assert.equal(c.state.active, "/b");

// reorder with insertion indexes
assert.deepEqual(roots(moveTab(s, 0, 3)), ["/b", "/c", "/a"]);
assert.deepEqual(roots(moveTab(s, 2, 0)), ["/c", "/a", "/b"]);
assert.equal(moveTab(s, 1, 2), s, "dropping in place is a no-op");

// scroll memory
assert.equal(saveScroll(s, "/a", 320).tabs[0].scrollY, 320);
assert.equal(saveScroll(s, "/a", 0), s);

// restore from storage: malformed, duplicate, foreign and unpermitted entries are dropped
const restored = sanitizeTabs(
  {
    active: "/admin/users",
    tabs: [
      { root: "/inbox", href: "/inbox", scrollY: 12.6 },
      { root: "/inbox", href: "/inbox" },
      { root: "/admin/users", href: "/admin/users" },
      { root: "/tasks", href: "//evil.example/tasks" },
      { root: "/tasks", href: "/customers" },
      { root: 3, href: "/x" },
      { root: "/bookings", href: "/bookings/9", scrollY: -4 },
      { root: "/a", href: "/a" }, { root: "/b", href: "/b" }, { root: "/c", href: "/c" }, { root: "/d", href: "/d" },
    ],
  },
  (root) => root !== "/admin/users",
);
assert.ok(restored);
assert.deepEqual(roots(restored), ["/inbox", "/bookings", "/a", "/b", "/c"]);
assert.equal(restored.active, "/inbox", "unpermitted active falls back to the first tab");
assert.equal(restored.tabs[0].scrollY, 13);
assert.equal(restored.tabs[1].scrollY, 0);
assert.equal(sanitizeTabs({ tabs: [] }, () => true), null);
assert.equal(sanitizeTabs("nope", () => true), null);

console.log("workspace-tabs self-test OK");
