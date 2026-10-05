"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CalendarClock,
  ClipboardCheck,
  Hotel,
  LayoutDashboard,
  Link2,
  Plane,
  Receipt,
  Route,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { readinessChecks, type Departure, type PricingTier, type TourPackage, type TourPackageRepository } from "@/entities/tourpackage";
import { useCan } from "@/entities/viewer";
import { ClonePackageDialog } from "@/features/clone-package";
import { CreateDepartureDialog } from "@/features/create-departure";
import { PackageFormDialog } from "@/features/package-form";
import { PricingTiersDialog } from "@/features/pricing-tiers";
import { routes } from "@/shared/config/routes";
import { Link, useRouter } from "@/shared/i18n/navigation";
import { EmptyState, LoadingState, QueryState, Screen, Tabs, TabsContent, TabsList, TabsTrigger, errorKind, useToast } from "@/shared/ui";
import { usePackageLinks } from "../model/use-package-links";
import { PACKAGE_TABS, usePackageTab, type PackageTab } from "../model/use-package-tab";
import { DepartureCard } from "./departure-card";
import { PackageHero } from "./package-hero";
import { PackageLinksTab } from "./package-links-tab";
import { HotelsTab, ItineraryTab, LogisticsTab, OverviewTab, PricingTab, RequirementsTab, ServicesTab } from "./package-tabs";

const TAB_ICON: Record<PackageTab, LucideIcon> = {
  overview: LayoutDashboard,
  hotels: Hotel,
  pricing: Receipt,
  logistics: Plane,
  services: Sparkles,
  itinerary: Route,
  requirements: ClipboardCheck,
  departures: CalendarClock,
  links: Link2,
};

type Props = {
  packageId: string;
  repository: TourPackageRepository;
};

export function PackageDetailBoard({ packageId, repository }: Props) {
  const t = useTranslations("packages");
  const { push } = useToast();
  const router = useRouter();
  const canWrite = useCan("packages.write");
  const [tab, selectTab] = usePackageTab();
  const [pkg, setPkg] = useState<TourPackage | null>(null);
  const [deps, setDeps] = useState<Departure[]>([]);
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [editing, setEditing] = useState(false);
  const links = usePackageLinks(packageId);

  const refresh = useCallback(async () => {
    try {
      const [p, d, tr] = await Promise.all([
        repository.getPackage(packageId),
        repository.listDepartures(packageId),
        repository.listPackageTiers(packageId).catch(() => [] as PricingTier[]),
      ]);
      setPkg(p);
      setDeps(d);
      setTiers(tr);
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, [packageId, repository]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const checks = useMemo(
    () => (pkg ? readinessChecks(pkg, tiers.some((x) => x.kind !== "age" && x.isActive && x.amount > 0) || pkg.stats.fromPrice > 0) : null),
    [pkg, tiers],
  );

  function upsertDeparture(d: Departure) {
    setDeps((prev) => [...prev.filter((x) => x.id !== d.id), d].sort((a, b) => a.departDate.localeCompare(b.departDate)));
  }

  if (error) {
    return (
      <Screen>
        <QueryState error={error} errorTitle={errorKind(error) === "notFound" ? t("notFound") : undefined} onRetry={() => void refresh()}>
          {null}
        </QueryState>
      </Screen>
    );
  }

  if (!pkg || !checks) {
    return (
      <Screen>
        <LoadingState variant="detail" label={t("loading")} />
      </Screen>
    );
  }

  const departureAction = canWrite ? (
    <CreateDepartureDialog
      packageId={pkg.id}
      repository={repository}
      onCreated={async () => {
        await refresh();
        push({ title: t("departureCreatedTitle"), description: t("departureCreatedBody"), tone: "success" });
      }}
    />
  ) : null;

  return (
    <Screen>
      <Link href={routes.packages} className="text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-950">
        <span className="rtl:hidden">←</span>
        <span className="hidden rtl:inline">→</span> {t("backToPackages")}
      </Link>

      <PackageHero
        pkg={pkg}
        checks={checks}
        canWrite={canWrite}
        onEdit={() => setEditing(true)}
        actions={
          canWrite ? (
            <ClonePackageDialog
              source={pkg}
              repository={repository}
              onCloned={(clone) => {
                push({ title: t("packageClonedTitle"), tone: "success" });
                if (clone?.id) router.push(routes.package(clone.id));
              }}
            />
          ) : null
        }
      />

      <Tabs value={tab} onValueChange={selectTab} className="mt-5">
        <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="h-auto w-max min-w-full gap-1 rounded-[22px] p-1.5" aria-label={t("title")}>
            {PACKAGE_TABS.map((key) => {
              const Icon = TAB_ICON[key];
              return (
                <TabsTrigger key={key} value={key} className="group gap-2 rounded-2xl px-3.5 py-2.5 text-[13.5px]" data-testid={`package-tab-${key}`}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} aria-hidden />
                  {t(`detail.tabs.${key}`)}
                  {key === "departures" || (key === "links" && links.summary.total > 0) ? (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-600">
                      {key === "departures" ? deps.length : links.summary.total}
                    </span>
                  ) : null}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab pkg={pkg} checks={checks} onJump={selectTab} />
        </TabsContent>
        <TabsContent value="hotels" className="mt-4">
          <HotelsTab pkg={pkg} />
        </TabsContent>
        <TabsContent value="pricing" className="mt-4">
          <PricingTab pkg={pkg} tiers={tiers} action={canWrite ? <PricingTiersDialog packageId={pkg.id} repository={repository} onSaved={() => void refresh()} /> : null} />
        </TabsContent>
        <TabsContent value="logistics" className="mt-4">
          <LogisticsTab pkg={pkg} />
        </TabsContent>
        <TabsContent value="services" className="mt-4">
          <ServicesTab pkg={pkg} />
        </TabsContent>
        <TabsContent value="itinerary" className="mt-4">
          <ItineraryTab pkg={pkg} />
        </TabsContent>
        <TabsContent value="requirements" className="mt-4">
          <RequirementsTab pkg={pkg} />
        </TabsContent>
        <TabsContent value="departures" className="mt-4 space-y-3">
          {departureAction ? <div className="flex justify-end">{departureAction}</div> : null}
          {deps.length === 0 ? (
            <EmptyState icon={CalendarClock} title={t("noDepartures")} description={t("noDeparturesHint")} />
          ) : (
            deps.map((d) => <DepartureCard key={d.id} departure={d} repository={repository} onChanged={upsertDeparture} />)
          )}
        </TabsContent>
        <TabsContent value="links" className="mt-4">
          <PackageLinksTab pkg={pkg} departures={deps} links={links} />
        </TabsContent>
      </Tabs>

      <PackageFormDialog
        repository={repository}
        pkg={pkg}
        open={editing}
        onOpenChange={setEditing}
        onSaved={() => void refresh()}
      />
    </Screen>
  );
}
