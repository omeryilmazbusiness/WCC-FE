import { bffHttp } from "@/shared/api/http-client";
import type {
  LoginResult,
  MfaEnrollResponse,
  MfaSetupConfirmResult,
  MfaVerifyRequest,
} from "@/shared/api/auth-contract";

/** All calls hit same-origin BFF routes; tokens are set as HttpOnly cookies there. */
/**
 * `company` scopes the sign-in to that company's login page, `platform` to the platform
 * admin page; accounts that do not belong there are rejected.
 */
export type LoginScope = { company?: string; platform?: boolean };

export function login(email: string, password: string, scope: LoginScope = {}): Promise<LoginResult> {
  return bffHttp.request<LoginResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, ...scope }),
  });
}

export function verifyMfa(body: MfaVerifyRequest): Promise<LoginResult> {
  return bffHttp.request<LoginResult>("/auth/mfa/verify", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function startMfaSetup(): Promise<MfaEnrollResponse> {
  return bffHttp.request<MfaEnrollResponse>("/auth/mfa/setup", { method: "POST" });
}

export function confirmMfaSetup(code: string): Promise<MfaSetupConfirmResult> {
  return bffHttp.request<MfaSetupConfirmResult>("/auth/mfa/setup/confirm", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function logout(): Promise<void> {
  await bffHttp.request("/auth/logout", { method: "POST" }).catch(() => undefined);
}
