"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type {
  Departure,
  TourPackage,
  TourPackageRepository,
} from "@/entities/tourpackage";
import { CreateDepartureDialog } from "@/features/create-departure";
import { PricingTiersDialog } from "@/features/pricing-tiers";
import { ClonePackageDialog } from "@/features/clone-package";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import {
  EmptyState,
  PageHeader,
  Screen,
  useToast,
} from "@/shared/ui";
import { DepartureCard } from "./departure-card";

type Props = {
  packageId: string;
  repository: TourPackageRepository;
};

export function PackageDetailBoard({ packageId, repository }: Props) {
  const t = useTranslations("packages");
  const { push } = useToast();
  const [pkg, setPkg] = useState<TourPackage | null>(null);
  const [deps, setDeps] = useState<Departure[]>([]);
  const [error, setError] = useState(false);

  async function refresh() {
    try {
      const [p, d] = await Promise.all([
        repository.getPackage(packageId),
        repository.listDepartures(packageId),
      ]);
      setPkg(p);
      setDeps(d);
      setError(false);
    } catch {
      setError(true);
    }
  }

  useEffect(() => {
    void refresh();
  }, [packageId, repository]);

  function upsertDeparture(d: Departure) {
    setDeps((prev) => {
      const rest = prev.filter((x) => x.id !== d.id);
      return [...rest, d].sort((a, b) => a.departDate.localeCompare(b.departDate));
    });
  }

  if (error) {
    return <EmptyState title={t("notFound")} />;
  }

  if (!pkg) {
    return (
      <Screen>
        <p className="text-sm font-medium text-zinc-500">{t("loading")}</p>
      </Screen>
    );
  }

  return (
    <Screen>
      <Link
        href={routes.packages}
        className="text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-950"
      >
        ← {t("backToPackages")}
      </Link>
      <PageHeader
        title={pkg.nameEn}
        description={
          pkg.nameAr
            ? `${pkg.code} · ${pkg.nameAr}`
            : `${pkg.code}${pkg.description ? ` · ${pkg.description}` : ""}`
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <PricingTiersDialog packageId={pkg.id} repository={repository} />
            <ClonePackageDialog
              source={pkg}
              repository={repository}
              onCloned={() => {
                push({ title: t("packageClonedTitle"), tone: "success" });
              }}
            />
            <CreateDepartureDialog
              packageId={pkg.id}
              repository={repository}
              onCreated={async () => {
                await refresh();
                push({
                  title: t("departureCreatedTitle"),
                  description: t("departureCreatedBody"),
                  tone: "success",
                });
              }}
            />
          </div>
        }
      />

      {pkg.description && pkg.nameAr ? (
        <p className="text-sm font-medium text-zinc-500">{pkg.description}</p>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t("departures")}
        </h2>
        {deps.length === 0 ? (
          <EmptyState
            title={t("noDepartures")}
            description={t("noDeparturesHint")}
          />
        ) : (
          deps.map((d) => (
            <DepartureCard
              key={d.id}
              departure={d}
              repository={repository}
              onChanged={upsertDeparture}
            />
          ))
        )}
      </div>
    </Screen>
  );
}
