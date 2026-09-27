import type { AccessScope, Permission } from "@/shared/config/permissions";
import type { AppRole } from "@/shared/config/routes";

/** All three cookies are HttpOnly and only ever touched by the BFF / middleware. */
export const ACCESS_COOKIE = "wcc_at";
export const REFRESH_COOKIE = "wcc_rt";
/** HMAC-signed viewer snapshot used for UI routing; never for authorization. */
export const SESSION_COOKIE = "wcc_session";
export const ENROLLMENT_COOKIE = "wcc_mfa_setup";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  branchId: string;
  teamId?: string | null;
  mfaEnabled?: boolean;
};

export type ViewerSession = {
  user: SessionUser;
  permissions: Permission[];
  scope: AccessScope;
  /** Epoch ms when the refresh session ends. */
  expiresAt: number;
  mfaEnrollmentRequired?: boolean;
  demo?: boolean;
};
