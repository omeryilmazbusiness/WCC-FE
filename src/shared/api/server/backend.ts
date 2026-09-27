import {
  ApiError,
  apiErrorFromResponse,
  UPSTREAM_UNAVAILABLE_CODE,
} from "../api-error";
import { serverEnv } from "./server-env";

export type ClientMeta = {
  forwardedFor?: string;
  userAgent?: string;
  requestId?: string;
};

type BackendInit = Omit<RequestInit, "headers"> & {
  headers?: HeadersInit;
  accessToken?: string;
  meta?: ClientMeta;
};

export function upstreamUnavailable(): ApiError {
  return new ApiError({
    status: 503,
    code: UPSTREAM_UNAVAILABLE_CODE,
    message: "Backend unavailable",
  });
}

export function clientMetaFrom(headers: Headers): ClientMeta {
  return {
    forwardedFor: headers.get("x-forwarded-for") ?? headers.get("x-real-ip") ?? undefined,
    userAgent: headers.get("user-agent") ?? undefined,
    requestId: headers.get("x-request-id") ?? undefined,
  };
}

/** Server → Go backend. Network failures surface as a 503 `upstream_unavailable`. */
export async function backendFetch(path: string, init: BackendInit = {}): Promise<Response> {
  const { accessToken, meta, headers: extra, ...rest } = init;
  const headers = new Headers(extra);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (typeof rest.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (meta?.forwardedFor) headers.set("X-Forwarded-For", meta.forwardedFor);
  if (meta?.userAgent) headers.set("User-Agent", meta.userAgent);
  if (meta?.requestId) headers.set("X-Request-ID", meta.requestId);

  try {
    return await fetch(`${serverEnv.apiBaseUrl}${path}`, {
      ...rest,
      headers,
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    throw upstreamUnavailable();
  }
}

export async function backendJson<T>(path: string, init: BackendInit = {}): Promise<T> {
  const res = await backendFetch(path, init);
  if (!res.ok) throw await apiErrorFromResponse(res);
  const payload = await res.json().catch(() => ({}));
  return (payload?.data ?? payload) as T;
}
