import { PERMISSIONS } from "@/shared/config/permissions";

export type PermissionEntry = { permission: string; action: string; granted: boolean };
export type PermissionGroup = { domain: string; entries: PermissionEntry[]; granted: number };

const CATALOG_ORDER = new Map<string, number>(PERMISSIONS.map((p, i) => [p, i]));

function rank(permission: string): number {
  return CATALOG_ORDER.get(permission) ?? Number.MAX_SAFE_INTEGER;
}

/**
 * `users.read` → domain `users`, action `read`. Groups and entries follow the RBAC catalog
 * order; permissions the catalog does not know go last, alphabetically.
 */
export function groupPermissions(all: readonly string[], granted: readonly string[]): PermissionGroup[] {
  const has = new Set(granted);
  const sorted = [...new Set(all)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const groups: PermissionGroup[] = [];
  const byDomain = new Map<string, PermissionGroup>();
  for (const permission of sorted) {
    const dot = permission.indexOf(".");
    const domain = dot < 0 ? permission : permission.slice(0, dot);
    const action = dot < 0 ? "" : permission.slice(dot + 1);
    let group = byDomain.get(domain);
    if (!group) {
      group = { domain, entries: [], granted: 0 };
      byDomain.set(domain, group);
      groups.push(group);
    }
    const entry = { permission, action, granted: has.has(permission) };
    group.entries.push(entry);
    if (entry.granted) group.granted += 1;
  }
  return groups;
}

/** `security_cleanup` → `Security cleanup`; fallback label for codes without a translation. */
export function humanize(code: string): string {
  const text = code.replace(/[._]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
