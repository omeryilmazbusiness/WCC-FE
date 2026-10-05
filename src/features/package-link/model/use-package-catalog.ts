"use client";

import { useMemo } from "react";
import { createTourPackageRepository, type Departure, type TourPackage } from "@/entities/tourpackage";
import { useApiQuery } from "@/shared/lib/use-api-query";

const repo = createTourPackageRepository();

/** Every package of the branch (inactive included, so old links still resolve), cached across screens. */
export function usePackageCatalog(enabled = true) {
  const query = useApiQuery<TourPackage[]>(() => repo.listPackages(false), [], {
    cacheKey: ["packages", "catalog"],
    enabled,
  });
  const packages = useMemo(() => query.data ?? [], [query.data]);
  const byId = useMemo(() => new Map(packages.map((p) => [p.id, p])), [packages]);
  return { packages, byId, loading: query.loading, error: query.error, reload: query.reload };
}

/** Departures of one package; idle without a package. */
export function usePackageDepartures(packageId: string | null) {
  const query = useApiQuery<Departure[]>(
    () => (packageId ? repo.listDepartures(packageId) : Promise.resolve([])),
    [packageId],
    { cacheKey: ["packages", "departures", packageId], enabled: Boolean(packageId) },
  );
  return { departures: packageId ? (query.data ?? []) : [], loading: Boolean(packageId) && query.loading };
}
