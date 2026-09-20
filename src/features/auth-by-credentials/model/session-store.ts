"use client";

import { SESSION_COOKIE, serializeSession, type Session } from "@/shared/api/session";

const MAX_AGE = 60 * 60 * 24 * 7;

export function persistSession(session: Session) {
  const expiresAt = Date.now() + session.expiresIn * 1000;
  const enriched = { ...session, expiresAt };
  document.cookie = `${SESSION_COOKIE}=${serializeSession(enriched as Session)}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem("wcc_expires_at", String(expiresAt));
  }
}

export function clearSession() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem("wcc_expires_at");
  }
}

/** Client-side session expiry check (T-018). */
export function isSessionExpired(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.sessionStorage.getItem("wcc_expires_at");
  if (!raw) return false;
  return Date.now() > Number(raw);
}
