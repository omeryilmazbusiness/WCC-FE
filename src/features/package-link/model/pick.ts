import type { Departure, TourPackage } from "@/entities/tourpackage";

/** A package choice, optionally narrowed to one departure. */
export type PackagePick = { packageId: string | null; departureId: string | null };

export const NO_PACKAGE: PackagePick = { packageId: null, departureId: null };

export function pickOf(packageId?: string | null, departureId?: string | null): PackagePick {
  const pkg = packageId || null;
  return { packageId: pkg, departureId: pkg ? departureId || null : null };
}

export function samePick(a: PackagePick, b: PackagePick): boolean {
  return a.packageId === b.packageId && a.departureId === b.departureId;
}

export function packageName(p: Pick<TourPackage, "nameEn" | "nameAr">, locale: string): string {
  return locale === "ar" && p.nameAr ? p.nameAr : p.nameEn || p.nameAr;
}

export function packageOptionLabel(p: Pick<TourPackage, "code" | "nameEn" | "nameAr">, locale: string): string {
  return [p.code, packageName(p, locale)].filter(Boolean).join(" · ");
}

function haystack(p: TourPackage): string {
  const hotels = [p.spec?.makkah?.name, p.spec?.madinah?.name].filter(Boolean).join(" ");
  return `${p.code} ${p.nameEn} ${p.nameAr} ${p.kind} ${p.category} ${hotels}`.toLocaleLowerCase();
}

/**
 * Packages matching every word of q, best first: active and on sale, then the
 * soonest next departure, then code. Inactive packages only show when keepInactive
 * (an existing link must stay visible even after the package was retired).
 */
export function searchPackages(
  pkgs: readonly TourPackage[],
  q: string,
  opts: { keepId?: string | null } = {},
): TourPackage[] {
  const words = q.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const rank = (p: TourPackage) => (p.isActive ? 0 : 2) + (p.salesOpen ? 0 : 1);
  return pkgs
    .filter((p) => p.isActive || p.id === opts.keepId)
    .filter((p) => {
      if (words.length === 0) return true;
      const text = haystack(p);
      return words.every((w) => text.includes(w));
    })
    .sort((a, b) => {
      const r = rank(a) - rank(b);
      if (r !== 0) return r;
      const da = a.stats.nextDepartDate ?? "9999-12-31";
      const db = b.stats.nextDepartDate ?? "9999-12-31";
      if (da !== db) return da < db ? -1 : 1;
      return a.code.localeCompare(b.code);
    });
}

export function departureSeatsLeft(d: Pick<Departure, "capacityTotal" | "capacitySold" | "remaining">): number {
  return d.remaining ?? Math.max(0, d.capacityTotal - d.capacitySold);
}

/** A departure new bookings can go on: active, on sale and not full (unless oversell is allowed). */
export function isBookable(d: Departure): boolean {
  if (!d.isActive || d.salesClosed) return false;
  return d.allowOversell || departureSeatsLeft(d) > 0;
}

/** Active departures from today on, soonest first; today is YYYY-MM-DD. */
export function upcomingDepartures(deps: readonly Departure[], today: string): Departure[] {
  return deps
    .filter((d) => d.isActive && d.departDate >= today)
    .sort((a, b) => (a.departDate === b.departDate ? a.code.localeCompare(b.code) : a.departDate < b.departDate ? -1 : 1));
}

/** The soonest bookable departure, or null when none is left. */
export function defaultDepartureId(deps: readonly Departure[], today: string): string | null {
  return upcomingDepartures(deps, today).find(isBookable)?.id ?? null;
}

/**
 * Keeps a pick consistent with the departures loaded for its package: a departure
 * of another package (or one that vanished) is dropped; when required, the soonest
 * bookable departure fills the gap.
 */
export function reconcileDeparture(
  pick: PackagePick,
  deps: readonly Departure[],
  today: string,
  required: boolean,
): PackagePick {
  if (!pick.packageId) return NO_PACKAGE;
  const own = deps.filter((d) => d.packageId === pick.packageId);
  const kept = pick.departureId && own.some((d) => d.id === pick.departureId) ? pick.departureId : null;
  if (kept || !required) return { packageId: pick.packageId, departureId: kept };
  return { packageId: pick.packageId, departureId: defaultDepartureId(own, today) };
}

export function todayLocal(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
