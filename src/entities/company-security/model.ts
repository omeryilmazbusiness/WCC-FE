/** Company desk lock: 0 = off, otherwise minutes without click / type / scroll. */
export const IDLE_LOGOUT_MIN = 5;
export const IDLE_LOGOUT_MAX = 120;
export const IDLE_LOGOUT_DEFAULT = 15;
export const IDLE_LOGOUT_OPTIONS = [0, 5, 10, 15, 30, 45, 60, 90, 120] as const;

export type CompanySecurity = {
  idleLogoutMinutes: number;
};

export function isIdleLogoutMinutes(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && (value === 0 || (value >= IDLE_LOGOUT_MIN && value <= IDLE_LOGOUT_MAX));
}

/** Presets plus the current value when a company has a custom minute count. */
export function idleLogoutChoices(current: number): number[] {
  const set = new Set<number>(IDLE_LOGOUT_OPTIONS);
  if (isIdleLogoutMinutes(current)) set.add(current);
  return [...set].sort((a, b) => a - b);
}
