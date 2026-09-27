import { bffHttp } from "@/shared/api/http-client";
import type {
  LoginResult,
  MfaEnrollResponse,
  MfaSetupConfirmResult,
  MfaVerifyRequest,
} from "@/shared/api/auth-contract";

/** All calls hit same-origin BFF routes; tokens are set as HttpOnly cookies there. */
export function login(email: string, password: string): Promise<LoginResult> {
  return bffHttp.request<LoginResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
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
