import { createServerHttpClient } from "@/shared/api/server/server-http";
import { createUiPreferenceRepository } from "./api";
import type { UiPreferences } from "./model";

/** Server Component read; `null` when the API is unreachable, so the UI falls back to defaults. */
export async function loadUiPreferences(): Promise<UiPreferences | null> {
  try {
    return await createUiPreferenceRepository(await createServerHttpClient()).get();
  } catch {
    return null;
  }
}
