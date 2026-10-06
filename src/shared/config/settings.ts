import type { Permission } from "./permissions";
import { routes } from "./routes";

/** Settings hub; every section below it opens at `/admin/settings/{id}`. */
export const SETTINGS_ROOT = routes.adminSettings;

export type SettingsGroupId = "account" | "access";

export const SETTINGS_GROUPS: readonly SettingsGroupId[] = ["account", "access"];

export type SettingsSectionId = "profile" | "team" | "roles" | "audit";

export type SettingsSection = {
  id: SettingsSectionId;
  group: SettingsGroupId;
  /**
   * Permission of the API the section reads; the section is hidden and its page blocked without it.
   * Unset for the viewer's own account, which follows the hub itself.
   */
  permission?: Permission;
  /** Set when the section is a full page elsewhere; the row links there instead of a detail screen. */
  href?: string;
};

/** Display order inside each group follows this list. */
export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { id: "profile", group: "account" },
  { id: "team", group: "access", permission: "users.read", href: routes.team },
  { id: "roles", group: "access", permission: "roles.read" },
  { id: "audit", group: "access", permission: "audit.read" },
];

/** Sections that open as a detail screen inside settings. */
export type SettingsDetailId = Exclude<SettingsSectionId, "team">;

export function findSettingsSection(id: string): SettingsSection | undefined {
  return SETTINGS_SECTIONS.find((s) => s.id === id);
}

export function isSettingsDetail(id: string): id is SettingsDetailId {
  const section = findSettingsSection(id);
  return Boolean(section && !section.href);
}

export function settingsPath(section: SettingsSection): string {
  return section.href ?? `${SETTINGS_ROOT}/${section.id}`;
}

/** The hub opens for anyone who can see at least one of its detail sections. */
export const SETTINGS_HUB_PERMISSIONS: readonly Permission[] = [
  ...new Set(SETTINGS_SECTIONS.flatMap((s) => (!s.href && s.permission ? [s.permission] : []))),
];

/**
 * Guard for a path under the settings hub: the section's own permission, or any hub
 * permission for the hub itself (and unknown sections, which render "not found").
 * Null when the path is outside settings.
 */
export function settingsPermissionFor(pathWithoutLocale: string): Permission | readonly Permission[] | null {
  if (pathWithoutLocale === SETTINGS_ROOT) return SETTINGS_HUB_PERMISSIONS;
  if (!pathWithoutLocale.startsWith(`${SETTINGS_ROOT}/`)) return null;
  const id = pathWithoutLocale.slice(SETTINGS_ROOT.length + 1).split("/")[0];
  const section = findSettingsSection(id);
  return section && !section.href && section.permission ? section.permission : SETTINGS_HUB_PERMISSIONS;
}

export type SettingsGroup = { id: SettingsGroupId; sections: SettingsSection[] };

/** Groups in display order with only the sections `granted` allows; empty groups are dropped. */
export function visibleSettings(granted: readonly string[]): SettingsGroup[] {
  const hub = SETTINGS_HUB_PERMISSIONS.some((p) => granted.includes(p));
  return SETTINGS_GROUPS.map((id) => ({
    id,
    sections: SETTINGS_SECTIONS.filter((s) => s.group === id && (s.permission ? granted.includes(s.permission) : hub)),
  })).filter((g) => g.sections.length > 0);
}
