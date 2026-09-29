import { createServerHttpClient } from "@/shared/api/server/server-http";
import { createSetupRepository } from "./api";
import type { SetupOverview } from "./model";

/** Server Component read; `null` when the API is unreachable or forbids it. */
export async function loadSetupOverview(): Promise<SetupOverview | null> {
  try {
    return await createSetupRepository(await createServerHttpClient()).get();
  } catch {
    return null;
  }
}
