/**
 * Setup always opens on the intro (fly-in hero + language greeting). Picking another
 * language reloads `/setup` in that locale; this short-lived plain cookie carries
 * "language just chosen" across that one navigation so the steps show instead of the
 * intro again. The screen clears it as soon as it mounts.
 */
export const SETUP_INTRO_COOKIE = "wcc_setup_intro";

/** Long enough for the locale switch to render, short enough never to outlive it. */
const LANGUAGE_PICKED_TTL = 60;

export function setupIntroSeen(cookieValue: string | undefined, userId: string): boolean {
  return Boolean(cookieValue) && cookieValue === userId;
}

/** Every visit starts at the intro, except the render right after a language switch. */
export function shouldShowIntro(cookieValue: string | undefined, userId: string): boolean {
  return !setupIntroSeen(cookieValue, userId);
}

export function setupIntroCookie(userId: string): string {
  return `${SETUP_INTRO_COOKIE}=${encodeURIComponent(userId)}; path=/; max-age=${LANGUAGE_PICKED_TTL}; samesite=lax`;
}

export function clearSetupIntroCookie(): string {
  return `${SETUP_INTRO_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
