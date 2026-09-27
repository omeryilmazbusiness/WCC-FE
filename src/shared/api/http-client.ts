import {
  ApiError,
  apiErrorFromResponse,
  networkError,
} from "./api-error";
import { VIEWER_REFRESHED_HEADER } from "./auth-contract";
import { loginHref, sessionEndReason } from "./session-end";

export { ApiError } from "./api-error";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type HttpRequestInit = Omit<RequestInit, "method"> & {
  method?: HttpMethod;
};

export interface HttpClient {
  /** JSON request; unwraps the `{ data }` envelope. Throws `ApiError`. */
  request<T>(path: string, init?: HttpRequestInit): Promise<T>;
  /** Raw response for blobs / CSV / multipart. Throws `ApiError` on non-2xx. */
  raw(path: string, init?: HttpRequestInit): Promise<Response>;
}

/** Custom header required by the BFF proxy on every mutation (CSRF defence). */
export const CSRF_HEADER = "X-Requested-With";
export const CSRF_HEADER_VALUE = "wcc";

/** Browser → BFF proxy base path; the proxy attaches the HttpOnly access token. */
export const PROXY_BASE_PATH = "/api/proxy";

/** Window event: the BFF re-signed the viewer snapshot (role / permissions changed). */
export const VIEWER_REFRESHED_EVENT = "wcc:viewer-refreshed";

type FetchHttpClientOptions = {
  baseUrl: string;
  headers?: () => HeadersInit | Promise<HeadersInit>;
  credentials?: RequestCredentials;
  /** May return a replacement error to throw instead of the parsed one. */
  onUnauthorized?: (err: ApiError) => ApiError | void;
  onResponse?: (res: Response) => void;
};

export class FetchHttpClient implements HttpClient {
  constructor(private readonly options: FetchHttpClientOptions) {}

  async raw(path: string, init: HttpRequestInit = {}): Promise<Response> {
    const headers = new Headers(await this.options.headers?.());
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    if (typeof init.body === "string" && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    let res: Response;
    try {
      res = await fetch(`${this.options.baseUrl}${path}`, {
        ...init,
        headers,
        credentials: init.credentials ?? this.options.credentials,
      });
    } catch (err) {
      throw networkError(err);
    }

    this.options.onResponse?.(res);
    if (!res.ok) {
      const err = await apiErrorFromResponse(res);
      if (res.status === 401) throw this.options.onUnauthorized?.(err) ?? err;
      throw err;
    }
    return res;
  }

  async request<T>(path: string, init: HttpRequestInit = {}): Promise<T> {
    const res = await this.raw(path, init);
    if (res.status === 204) return undefined as T;
    const payload = await res.json().catch(() => ({}));
    return (payload?.data ?? payload) as T;
  }
}

function redirectToLogin(err: ApiError) {
  if (typeof window === "undefined") return;
  const locale = window.location.pathname.match(/^\/(en|ar)(?=\/|$)/)?.[1] ?? "en";
  if (window.location.pathname.startsWith(`/${locale}/login`)) return;
  window.location.assign(loginHref(locale, sessionEndReason(err)));
}

function announceViewerRefresh(res: Response) {
  if (typeof window === "undefined" || !res.headers.has(VIEWER_REFRESHED_HEADER)) return;
  window.dispatchEvent(new Event(VIEWER_REFRESHED_EVENT));
}

/**
 * The one HTTP client entity repositories use. Tokens never reach JS: requests go to
 * the same-origin BFF proxy, which reads the HttpOnly cookie and refreshes on 401.
 * A 401 surfacing here means the BFF already ended the session (cookies cleared).
 */
export const http: HttpClient = new FetchHttpClient({
  baseUrl: PROXY_BASE_PATH,
  credentials: "same-origin",
  headers: () => ({ [CSRF_HEADER]: CSRF_HEADER_VALUE }),
  onUnauthorized: redirectToLogin,
  onResponse: announceViewerRefresh,
});

/** Same-origin client for `/api/auth/*` BFF routes — 401 there means bad credentials. */
export const bffHttp: HttpClient = new FetchHttpClient({
  baseUrl: "/api",
  credentials: "same-origin",
  headers: () => ({ [CSRF_HEADER]: CSRF_HEADER_VALUE }),
});

export function downloadFilename(res: Response, fallback: string): string {
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match?.[1] ? decodeURIComponent(match[1]) : fallback;
}
