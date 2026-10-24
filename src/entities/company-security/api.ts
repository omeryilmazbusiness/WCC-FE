import { http } from "@/shared/api/http-client";
import { IDLE_LOGOUT_DEFAULT, isIdleLogoutMinutes, type CompanySecurity } from "./model";

export const SECURITY_ENDPOINTS = {
  security: "/setup/security",
} as const;

export function parseCompanySecurity(raw: unknown): CompanySecurity {
  const n = (raw as { idle_logout_minutes?: unknown } | null)?.idle_logout_minutes;
  return { idleLogoutMinutes: isIdleLogoutMinutes(n) ? n : IDLE_LOGOUT_DEFAULT };
}

export function getCompanySecurity(): Promise<CompanySecurity> {
  return http.request(SECURITY_ENDPOINTS.security).then(parseCompanySecurity);
}

export function saveCompanySecurity(idleLogoutMinutes: number): Promise<CompanySecurity> {
  return http
    .request(SECURITY_ENDPOINTS.security, {
      method: "PUT",
      body: JSON.stringify({ idle_logout_minutes: idleLogoutMinutes }),
    })
    .then(parseCompanySecurity);
}
