export type AdoptFailure = "exists" | "unavailable" | "other";

/** 409 `fx_rate_exists` / 422 `live_quote_unavailable` get dedicated copy. */
export function classifyAdoptError(err: unknown): AdoptFailure {
  const e = (err && typeof err === "object" ? err : {}) as { status?: unknown; code?: unknown };
  if (e.status === 409 && e.code === "fx_rate_exists") return "exists";
  if (e.status === 422 && e.code === "live_quote_unavailable") return "unavailable";
  return "other";
}
