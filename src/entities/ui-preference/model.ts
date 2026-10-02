/** Mirrors `domain/preference.MaxNavFavorites` on the backend. */
export const MAX_NAV_FAVORITES = 5;

export type UiPreferences = {
  /** Pinned sidebar routes in order; `null` until the user customises them. */
  navFavorites: string[] | null;
  /** When the first-login welcome was shown; `null` until the user has seen it. */
  welcomeSeenAt: string | null;
};
