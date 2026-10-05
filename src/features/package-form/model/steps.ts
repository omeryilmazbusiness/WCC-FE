/** The package sheet is filled in seven steps, one per part of the product brief. */
export const PACKAGE_STEPS = ["identity", "hotels", "pricing", "logistics", "services", "itinerary", "requirements"] as const;
export type PackageStep = (typeof PACKAGE_STEPS)[number];

const STEP_PREFIXES: Record<PackageStep, readonly string[]> = {
  identity: ["code", "nameEn", "nameAr", "description", "kind", "category", "durationDays", "transportMode", "capacityTotal", "baseCurrency", "salesOpen"],
  hotels: ["spec.nights", "spec.makkah", "spec.madinah"],
  pricing: ["prices", "costs", "spec.costs"],
  logistics: ["spec.flights", "spec.transfers"],
  services: ["spec.guidance", "spec.visa", "spec.kit", "spec.ziyarat", "spec.included", "spec.excluded"],
  itinerary: ["spec.itinerary"],
  requirements: ["spec.requirements"],
};

/** Step that owns a form field path (`spec.makkah.checkOut` → `hotels`). */
export function stepOfPath(path: string): PackageStep {
  for (const step of PACKAGE_STEPS) {
    if (STEP_PREFIXES[step].some((p) => path === p || path.startsWith(`${p}.`))) return step;
  }
  return "identity";
}

/** Flattens react-hook-form's nested error object into dotted paths. */
export function errorPaths(errors: unknown, prefix = ""): string[] {
  if (!errors || typeof errors !== "object") return [];
  const out: string[] = [];
  for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
    if (key === "ref" || key === "root") continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && "message" in value && typeof (value as { message?: unknown }).message === "string") {
      out.push(path);
    } else {
      out.push(...errorPaths(value, path));
    }
  }
  return out;
}

/** First step (in sheet order) that has an error, or null. */
export function firstErrorStep(errors: unknown): PackageStep | null {
  const steps = new Set(errorPaths(errors).map(stepOfPath));
  return PACKAGE_STEPS.find((s) => steps.has(s)) ?? null;
}
