export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HttpClient {
  request<T>(path: string, init?: RequestInit & { method?: HttpMethod }): Promise<T>;
}

type TokenProvider = () => string | null;

/**
 * Infrastructure HTTP adapter — depends on abstractions (DIP).
 * Swap baseUrl / token provider without touching features.
 */
export class FetchHttpClient implements HttpClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getToken: TokenProvider = () => null,
    private readonly onUnauthorized?: () => void,
  ) {}

  async request<T>(
    path: string,
    init: RequestInit & { method?: HttpMethod } = {},
  ): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const token = this.getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) {
        this.onUnauthorized?.();
      }
      const err = payload?.error;
      throw new ApiError(
        err?.message ?? res.statusText,
        res.status,
        err?.code,
      );
    }

    return (payload?.data ?? payload) as T;
  }
}
