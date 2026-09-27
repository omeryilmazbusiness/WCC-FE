import { env } from "@/shared/config/env";
import { isNetworkError } from "./api-error";

type AnyMethod = (...args: never[]) => unknown;

export type MethodKey<R> = {
  [K in keyof R]: R[K] extends AnyMethod ? K : never;
}[keyof R] &
  string;

export type CreateRepositoryOptions<R extends object> = {
  api: R;
  memory: R;
  /** Side-effect-free operations; only these may be served from memory. */
  reads: readonly MethodKey<R>[];
  demoMode?: boolean;
};

export function isDemoMode(): boolean {
  return env.demoMode;
}

function methodKeys(target: object): string[] {
  const keys = new Set<string>();
  let proto: object | null = target;
  while (proto && proto !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === "constructor") continue;
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc && typeof desc.value === "function") keys.add(key);
    }
    proto = Object.getPrototypeOf(proto);
  }
  return [...keys];
}

/**
 * Runs `read`; serves `fallback` only when demo mode is on AND the failure is a
 * network error. HTTP errors (401/403/409/422/5xx) always propagate.
 */
export async function withDemoFallback<T>(
  read: () => Promise<T>,
  fallback: () => T | Promise<T>,
  demoMode = isDemoMode(),
): Promise<T> {
  try {
    return await read();
  } catch (err) {
    if (demoMode && isNetworkError(err)) return fallback();
    throw err;
  }
}

/**
 * Composes an API repository with its in-memory twin. Writes and any HTTP error status
 * always reach the caller as `ApiError`; memory serves reads only in demo mode when the
 * backend is unreachable.
 */
export function createRepository<R extends object>({
  api,
  memory,
  reads,
  demoMode = isDemoMode(),
}: CreateRepositoryOptions<R>): R {
  const readSet = new Set<string>(reads);
  const out: Record<string, unknown> = {};
  const apiRecord = api as Record<string, AnyMethod>;
  const memoryRecord = memory as Record<string, AnyMethod>;

  for (const key of methodKeys(api)) {
    const apiFn = apiRecord[key].bind(api) as (...args: unknown[]) => unknown;
    const memoryFn = memoryRecord[key]?.bind(memory) as
      | ((...args: unknown[]) => unknown)
      | undefined;
    const canFallBack = demoMode && readSet.has(key) && Boolean(memoryFn);

    out[key] = canFallBack
      ? (...args: unknown[]) =>
          withDemoFallback(
            () => Promise.resolve(apiFn(...args)),
            () => memoryFn!(...args),
            true,
          )
      : apiFn;
  }
  return out as R;
}
