import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { isApiError } from "@/shared/api/api-error";

function camelCase(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Surfaces backend 400/422 `fieldErrors` on react-hook-form fields (snake_case keys are
 * mapped to camelCase). Returns true when at least one field was set.
 */
export function applyFieldErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  err: unknown,
  fields: readonly Path<T>[],
): boolean {
  if (!isApiError(err) || !err.fieldErrors) return false;
  const known = new Set<string>(fields);
  let applied = false;
  for (const [key, message] of Object.entries(err.fieldErrors)) {
    const name = known.has(key) ? key : camelCase(key);
    if (!known.has(name)) continue;
    setError(name as Path<T>, { type: "server", message });
    applied = true;
  }
  return applied;
}
