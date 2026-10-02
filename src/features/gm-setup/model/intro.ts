/**
 * The setup intro (fly-in hero + language greeting) is the first-login welcome: the
 * account's `welcomeSeenAt` preference decides it. This plain (non-HttpOnly) cookie is
 * written alongside, so a failed save never shows the welcome twice in the same browser.
 */
export const SETUP_INTRO_COOKIE = "wcc_setup_intro";

const ONE_YEAR = 60 * 60 * 24 * 365;

export function setupIntroSeen(cookieValue: string | undefined, userId: string): boolean {
  return Boolean(cookieValue) && cookieValue === userId;
}

/** First login only: unknown preferences (API down, demo) never show the welcome. */
export function shouldShowWelcome(welcomeSeenAt: string | null | undefined, cookieValue: string | undefined, userId: string): boolean {
  return welcomeSeenAt === null && !setupIntroSeen(cookieValue, userId);
}

export function setupIntroCookie(userId: string): string {
  return `${SETUP_INTRO_COOKIE}=${encodeURIComponent(userId)}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}
