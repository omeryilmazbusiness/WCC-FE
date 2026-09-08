import type { AppRole } from "@/shared/config/routes";

export const SESSION_COOKIE = "wcc_session";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  branchId: string;
};

export type Session = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: SessionUser;
};

export function parseSession(raw: string | undefined | null): Session | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(decodeURIComponent(raw)) as Session;
    if (!data?.accessToken || !data?.user?.role) return null;
    return data;
  } catch {
    return null;
  }
}

export function serializeSession(session: Session): string {
  return encodeURIComponent(JSON.stringify(session));
}
