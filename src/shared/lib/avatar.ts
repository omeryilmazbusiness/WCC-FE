/** First letters of the first and last word ("Aisha Khan" → "AK"); "?" for an empty name. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = Array.from(parts[0])[0] ?? "";
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Stable index in [0, buckets) for an id; keeps each person's avatar color fixed. */
export function colorIndex(id: string, buckets: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return buckets > 0 ? h % buckets : 0;
}
