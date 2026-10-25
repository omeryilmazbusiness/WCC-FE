/** The package sheet is filled in seven steps, one per part of the product brief. */
export const PACKAGE_STEPS = ["identity", "hotels", "pricing", "logistics", "services", "itinerary", "requirements"] as const;
export type PackageStep = (typeof PACKAGE_STEPS)[number];

/** Visa sheets only need identity, priced types and entry rules. */
export const VISA_PACKAGE_STEPS: readonly PackageStep[] = ["identity", "services", "requirements"];

export function stepsForKind(kind: string): readonly PackageStep[] {
  return kind === "visa" ? VISA_PACKAGE_STEPS : PACKAGE_STEPS;
}

const STEP_PREFIXES: Record<PackageStep, readonly string[]> = {
  identity: ["code", "nameEn", "nameAr", "description", "kind", "category", "customerId", "customerName", "durationDays", "transportMode", "capacityTotal", "baseCurrency", "salesOpen", "spec.destination"],
  hotels: ["spec.nights", "spec.makkah", "spec.madinah", "spec.stays"],
  pricing: ["prices", "costs", "spec.costs"],
  logistics: ["spec.flights", "spec.transfers", "spec.bus", "busPrice"],
  services: ["spec.guidance", "spec.visa", "spec.visaOffers", "visaOffers", "spec.kit", "spec.ziyarat", "spec.services", "spec.activities", "spec.included", "spec.excluded"],
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
    if (key === "ref") continue;
    if (key === "root") {
      if (value && typeof value === "object" && typeof (value as { message?: unknown }).message === "string" && prefix) {
        out.push(prefix);
      }
      continue;
    }
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
export function firstErrorStep(errors: unknown, kind = ""): PackageStep | null {
  const steps = new Set(errorPaths(errors).map(stepOfPath));
  return stepsForKind(kind).find((s) => steps.has(s)) ?? null;
}
