const HOUR_S = 3600;
const DAY_S = 24 * HOUR_S;
const DAY_MS = DAY_S * 1000;

export const HOLD_DEFAULT_DAYS = 3;
export const HOLD_MAX_DAYS = 14;
/** Under this many seconds the countdown turns red. */
export const HOLD_URGENT_SECONDS = DAY_S;

export type HoldCountdown =
  | { key: "expired"; urgent: true; values: Record<string, never> }
  | { key: "days"; urgent: boolean; values: { days: number; hours: number } }
  | { key: "hours"; urgent: boolean; values: { hours: number; minutes: number } }
  | { key: "minutes"; urgent: boolean; values: { minutes: number } };

/** Remaining seconds → i18n key + values ("expires in 2d 4h"); units below the shown pair are dropped. */
export function holdCountdown(remainingSeconds: number): HoldCountdown {
  const s = Math.max(0, Math.floor(remainingSeconds));
  if (s === 0) return { key: "expired", urgent: true, values: {} };
  const urgent = s < HOLD_URGENT_SECONDS;
  const days = Math.floor(s / DAY_S);
  const hours = Math.floor((s % DAY_S) / HOUR_S);
  const minutes = Math.floor((s % HOUR_S) / 60);
  if (days > 0) return { key: "days", urgent, values: { days, hours } };
  if (hours > 0) return { key: "hours", urgent, values: { hours, minutes } };
  return { key: "minutes", urgent, values: { minutes: Math.max(1, minutes) } };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Date → `YYYY-MM-DDTHH:mm` in local time, the `datetime-local` input format. */
export function toDateTimeLocal(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function defaultHoldExpiry(now: Date = new Date()): string {
  return toDateTimeLocal(new Date(now.getTime() + HOLD_DEFAULT_DAYS * DAY_MS));
}

export function maxHoldExpiry(now: Date = new Date()): string {
  return toDateTimeLocal(new Date(now.getTime() + HOLD_MAX_DAYS * DAY_MS));
}

export type HoldExpiryError = "required" | "past" | "tooFar";

export function holdExpiryError(local: string, now: Date = new Date()): HoldExpiryError | null {
  if (!local) return "required";
  const at = new Date(local).getTime();
  if (Number.isNaN(at)) return "required";
  if (at <= now.getTime()) return "past";
  if (at > now.getTime() + HOLD_MAX_DAYS * DAY_MS) return "tooFar";
  return null;
}

/** `datetime-local` value → RFC 3339 UTC instant without milliseconds. */
export function localToRfc3339(local: string): string {
  return new Date(local).toISOString().replace(/\.\d{3}Z$/, "Z");
}
