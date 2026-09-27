import {
  AUTH_ENDPOINTS,
  type BackendSession,
  type RevokedCountResponse,
} from "@/shared/api/auth-contract";
import { http } from "@/shared/api/http-client";

export function listSessions(): Promise<BackendSession[]> {
  return http.request<BackendSession[]>(AUTH_ENDPOINTS.sessions);
}

export async function revokeSession(id: string): Promise<void> {
  await http.request(AUTH_ENDPOINTS.session(id), { method: "DELETE" });
}

export function revokeOtherSessions(): Promise<RevokedCountResponse> {
  return http.request<RevokedCountResponse>(AUTH_ENDPOINTS.revokeOtherSessions, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/** Current device first, then most recently active. */
export function sortSessions(sessions: readonly BackendSession[]): BackendSession[] {
  return [...sessions].sort(
    (a, b) =>
      Number(b.current) - Number(a.current) ||
      Date.parse(b.last_seen_at) - Date.parse(a.last_seen_at),
  );
}
