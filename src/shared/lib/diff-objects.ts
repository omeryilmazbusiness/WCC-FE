export type DiffKind = "added" | "removed" | "changed" | "unchanged";

export type DiffEntry = {
  key: string;
  kind: DiffKind;
  before?: unknown;
  after?: unknown;
};

export type ObjectDiff = {
  added: string[];
  removed: string[];
  changed: string[];
  /** Every key of both sides, sorted, including unchanged ones. */
  entries: DiffEntry[];
};

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Structural equality for JSON-like values (key order independent). */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => deepEqual(item, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    return keys.every((k) => Object.hasOwn(b, k) && deepEqual(a[k], b[k]));
  }
  return false;
}

/**
 * Top-level diff of two snapshots (audit `before` / `after`). A null side means the
 * entity was created (all keys added) or deleted (all keys removed).
 */
export function diffObjects(
  before: PlainObject | null | undefined,
  after: PlainObject | null | undefined,
): ObjectDiff {
  const b = before ?? {};
  const a = after ?? {};
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].sort();
  const out: ObjectDiff = { added: [], removed: [], changed: [], entries: [] };

  for (const key of keys) {
    const inBefore = Object.hasOwn(b, key);
    const inAfter = Object.hasOwn(a, key);
    let kind: DiffKind;
    if (!inBefore) kind = "added";
    else if (!inAfter) kind = "removed";
    else kind = deepEqual(b[key], a[key]) ? "unchanged" : "changed";

    if (kind !== "unchanged") out[kind].push(key);
    out.entries.push({
      key,
      kind,
      ...(inBefore ? { before: b[key] } : {}),
      ...(inAfter ? { after: a[key] } : {}),
    });
  }
  return out;
}

/** Compact single-line rendering of a diff cell value. */
export function formatDiffValue(value: unknown): string {
  if (value === undefined) return "";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
