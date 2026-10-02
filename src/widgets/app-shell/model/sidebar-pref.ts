/** UI-only cookie (not HttpOnly) so the server renders the sidebar at the right width. */
export const SIDEBAR_COOKIE = "wcc_sidebar";

export function isSidebarCollapsed(value: string | undefined): boolean {
  return value === "collapsed";
}
