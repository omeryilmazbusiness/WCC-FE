import type { NextResponse } from "next/server";
import { ACCESS_COOKIE, ENROLLMENT_COOKIE, REFRESH_COOKIE, SESSION_COOKIE } from "../session";
import { serverEnv } from "./server-env";

export type TokenSet = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

function baseOptions() {
  return {
    httpOnly: true,
    secure: serverEnv.secureCookies,
    sameSite: "lax" as const,
    path: "/",
  };
}

export function setTokenCookies(res: NextResponse, tokens: TokenSet) {
  res.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions(),
    maxAge: Math.max(1, Math.floor(tokens.expiresIn)),
  });
  res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions(),
    maxAge: serverEnv.sessionMaxAgeSeconds,
  });
}

export function setSessionCookie(res: NextResponse, signedSession: string) {
  res.cookies.set(SESSION_COOKIE, signedSession, {
    ...baseOptions(),
    maxAge: serverEnv.sessionMaxAgeSeconds,
  });
}

export function setEnrollmentCookie(res: NextResponse, token: string, expiresIn: number) {
  res.cookies.set(ENROLLMENT_COOKIE, token, {
    ...baseOptions(),
    maxAge: Math.max(1, Math.floor(expiresIn)),
  });
}

export function clearEnrollmentCookie(res: NextResponse) {
  res.cookies.set(ENROLLMENT_COOKIE, "", { ...baseOptions(), maxAge: 0 });
}

export function clearAuthCookies(res: NextResponse) {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, SESSION_COOKIE, ENROLLMENT_COOKIE]) {
    res.cookies.set(name, "", { ...baseOptions(), maxAge: 0 });
  }
}

export function sessionExpiresAt(): number {
  return Date.now() + serverEnv.sessionMaxAgeSeconds * 1000;
}
