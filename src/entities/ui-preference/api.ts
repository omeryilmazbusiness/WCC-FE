import { http, type HttpClient } from "@/shared/api/http-client";
import type { UiPreferences } from "./model";

export const UI_PREFERENCES_PATH = "/me/preferences";

export function mapUiPreferences(raw: unknown): UiPreferences {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = r.nav_favorites;
  return {
    navFavorites: Array.isArray(list)
      ? list.filter((v): v is string => typeof v === "string")
      : null,
  };
}

export type UiPreferenceRepository = {
  get(): Promise<UiPreferences>;
  /** `null` restores the role default. */
  setNavFavorites(routes: readonly string[] | null): Promise<UiPreferences>;
};

export function createUiPreferenceRepository(client: HttpClient = http): UiPreferenceRepository {
  return {
    get: async () => mapUiPreferences(await client.request<unknown>(UI_PREFERENCES_PATH)),
    setNavFavorites: async (routes) =>
      mapUiPreferences(
        await client.request<unknown>(UI_PREFERENCES_PATH, {
          method: "PUT",
          body: JSON.stringify({ nav_favorites: routes }),
        }),
      ),
  };
}
