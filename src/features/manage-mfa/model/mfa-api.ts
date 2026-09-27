import {
  AUTH_ENDPOINTS,
  type MfaConfirmResponse,
  type MfaDisableRequest,
  type MfaEnrollResponse,
} from "@/shared/api/auth-contract";
import { http } from "@/shared/api/http-client";

export function enrollMfa(): Promise<MfaEnrollResponse> {
  return http.request<MfaEnrollResponse>(AUTH_ENDPOINTS.mfaEnroll, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function confirmMfa(code: string): Promise<MfaConfirmResponse> {
  return http.request<MfaConfirmResponse>(AUTH_ENDPOINTS.mfaConfirm, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function disableMfa(body: MfaDisableRequest): Promise<void> {
  await http.request(AUTH_ENDPOINTS.mfaDisable, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function regenerateRecoveryCodes(code: string): Promise<MfaConfirmResponse> {
  return http.request<MfaConfirmResponse>(AUTH_ENDPOINTS.mfaRecoveryCodes, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}
