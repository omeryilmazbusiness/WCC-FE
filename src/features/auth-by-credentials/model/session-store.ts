"use client";

import { SESSION_COOKIE, serializeSession, type Session } from "@/shared/api/session";

const MAX_AGE = 60 * 60 * 24 * 7;

export function persistSession(session: Session) {
  document.cookie = `${SESSION_COOKIE}=${serializeSession(session)}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function clearSession() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
