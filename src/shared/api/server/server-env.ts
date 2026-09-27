import { env } from "@/shared/config/env";

const DEV_SESSION_SECRET = "wcc-dev-only-session-secret-change-me-0000";
const DEFAULT_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/** Server-only configuration — none of these values are exposed to the browser bundle. */
export const serverEnv = {
  apiBaseUrl: process.env.API_BASE_URL ?? env.apiBaseUrl,
  secureCookies:
    process.env.COOKIE_SECURE === "true" ||
    (process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false"),
  sessionMaxAgeSeconds:
    Number(process.env.SESSION_MAX_AGE_SECONDS) || DEFAULT_SESSION_MAX_AGE,
  allowedOrigins: (process.env.BFF_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
} as const;

/** Resolved lazily so `next build` does not require the secret. */
export function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set (>= 32 chars) in production");
  }
  return DEV_SESSION_SECRET;
}
