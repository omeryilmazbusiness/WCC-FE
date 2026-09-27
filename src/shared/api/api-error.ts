export type FieldErrors = Record<string, string>;

export type ApiErrorInit = {
  status: number;
  code: string;
  message: string;
  fieldErrors?: FieldErrors;
  retryAfter?: number;
  reason?: string;
  details?: Record<string, unknown>;
};

export const NETWORK_ERROR_CODE = "network_error";
/** Emitted by the BFF proxy when the backend itself is unreachable. */
export const UPSTREAM_UNAVAILABLE_CODE = "upstream_unavailable";
export const SESSION_EXPIRED_CODE = "session_expired";

/**
 * Typed transport error parsed from the backend envelope `{ error: { code, message } }`.
 * `status === 0` means the request never produced an HTTP response.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: FieldErrors;
  /** Seconds until the caller may retry (423 lockout / 429 rate limit). */
  readonly retryAfter?: number;
  /** Machine-readable sub-cause, e.g. why a `session_expired` session ended. */
  readonly reason?: string;
  /** Raw `error.details` object, e.g. `{ guards: [...] }` on 422 `guard_failed`. */
  readonly details?: Record<string, unknown>;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.fieldErrors = init.fieldErrors;
    this.retryAfter = init.retryAfter;
    this.reason = init.reason;
    this.details = init.details;
  }

  get isNetwork(): boolean {
    return this.status === 0 || this.code === UPSTREAM_UNAVAILABLE_CODE;
  }

  /** String entries of `error.details[key]` (empty when absent or not a list). */
  detailList(key: string): string[] {
    const value = this.details?.[key];
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

/** Offline / DNS / CORS failure or backend unreachable behind the BFF. */
export function isNetworkError(err: unknown): boolean {
  if (err instanceof ApiError) return err.isNetwork;
  return err instanceof TypeError;
}

export function networkError(cause?: unknown): ApiError {
  const message =
    cause instanceof Error && cause.message ? cause.message : "Network error";
  return new ApiError({ status: 0, code: NETWORK_ERROR_CODE, message });
}

function parseRetryAfter(header: string | null, body: unknown): number | undefined {
  if (typeof body === "number" && Number.isFinite(body) && body > 0) {
    return Math.ceil(body);
  }
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  const date = Date.parse(header);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

function parseFieldErrors(raw: unknown): FieldErrors | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  if (Array.isArray(raw)) {
    const out: FieldErrors = {};
    for (const item of raw) {
      if (item && typeof item === "object") {
        const r = item as Record<string, unknown>;
        const field = r.field ?? r.name;
        const message = r.message ?? r.error;
        if (typeof field === "string" && typeof message === "string") {
          out[field] = message;
        }
      }
    }
    return Object.keys(out).length ? out : undefined;
  }
  const out: FieldErrors = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string") out[key] = value;
    else if (Array.isArray(value) && typeof value[0] === "string") out[key] = value[0];
  }
  return Object.keys(out).length ? out : undefined;
}

export function apiErrorFromPayload(
  status: number,
  payload: unknown,
  headers?: Headers,
  statusText = "",
): ApiError {
  const body = (payload && typeof payload === "object" ? payload : {}) as Record<
    string,
    unknown
  >;
  const err = (body.error && typeof body.error === "object" ? body.error : {}) as Record<
    string,
    unknown
  >;
  const code =
    typeof err.code === "string" && err.code ? err.code : `http_${status}`;
  const message =
    typeof err.message === "string" && err.message
      ? err.message
      : statusText || `Request failed (${status})`;
  return new ApiError({
    status,
    code,
    message,
    fieldErrors: parseFieldErrors(err.fields ?? err.field_errors ?? err.details),
    retryAfter: parseRetryAfter(
      headers?.get("Retry-After") ?? null,
      err.retry_after ?? body.retry_after,
    ),
    reason: typeof err.reason === "string" && err.reason ? err.reason : undefined,
    details:
      err.details && typeof err.details === "object" && !Array.isArray(err.details)
        ? (err.details as Record<string, unknown>)
        : undefined,
  });
}

export async function apiErrorFromResponse(res: Response): Promise<ApiError> {
  const payload = await res
    .clone()
    .json()
    .catch(() => null);
  return apiErrorFromPayload(res.status, payload, res.headers, res.statusText);
}
