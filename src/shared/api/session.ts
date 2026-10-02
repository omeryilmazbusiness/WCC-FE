import type { AccessScope, Permission } from "@/shared/config/permissions";
import type { AppRole } from "@/shared/config/routes";

/** All three cookies are HttpOnly and only ever touched by the BFF / middleware. */
export const ACCESS_COOKIE = "wcc_at";
export const REFRESH_COOKIE = "wcc_rt";
/** HMAC-signed viewer snapshot used for UI routing; never for authorization. */
export const SESSION_COOKIE = "wcc_session";
export const ENROLLMENT_COOKIE = "wcc_mfa_setup";
/** Company slug of the last sign-in; sends `/login` and expired sessions to that company's page. */
export const COMPANY_COOKIE = "wcc_company";
/** Last branch a company-wide viewer worked in (branch id); a routing hint only. */
export const BRANCH_COOKIE = "wcc_branch";
/** Request header the middleware sets on workspace pages: the active branch id. */
export const ACTIVE_BRANCH_HEADER = "x-wcc-branch-id";
/** Request header (`company/branch`) the middleware sets for server layouts. */
export const WORKSPACE_HEADER = "x-wcc-workspace";
/** Browser → BFF proxy: slug of the branch in the page URL. */
export const BRANCH_SLUG_HEADER = "x-wcc-branch";
/** Backend header selecting the branch a company-wide caller acts on. */
export const BACKEND_BRANCH_HEADER = "X-Branch-ID";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  branchId: string;
  teamId?: string | null;
  mfaEnabled?: boolean;
};

export type BranchKind = "main_center" | "branch";

export type SessionBranch = {
  id: string;
  slug: string;
  code: string;
  nameEn: string;
  nameAr: string;
  kind: BranchKind;
};

export type SessionCompany = {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
};

/** The viewer's tenant: company-wide viewers see every branch, staff only their own. */
export type SessionWorkspace = {
  company: SessionCompany;
  homeBranchId: string;
  branches: SessionBranch[];
};

export type ViewerSession = {
  user: SessionUser;
  permissions: Permission[];
  scope: AccessScope;
  workspace?: SessionWorkspace;
  /** Epoch ms when the refresh session ends. */
  expiresAt: number;
  mfaEnrollmentRequired?: boolean;
  demo?: boolean;
};
