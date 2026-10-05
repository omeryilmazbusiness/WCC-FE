"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Calculator, CalendarRange, FileSignature, LayoutDashboard, ShieldCheck, Warehouse, type LucideIcon } from "lucide-react";
import type { DocumentRepository } from "@/entities/document";
import type { Allotment, HotelRepository } from "@/entities/hotel";
import { useCan } from "@/entities/viewer";
import { ContractPanel } from "@/features/hotel-contract";
import { HotelFormDialog } from "@/features/hotel-form";
import { QuoteCalculator } from "@/features/hotel-quote";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { LoadingState, QueryState, Screen, Tabs, TabsContent, TabsList, TabsTrigger, errorKind } from "@/shared/ui";
import { HOTEL_TABS, useHotelTab, type HotelTab } from "../model/use-hotel-tab";
import { HotelHero } from "./hotel-hero";
import { InventoryTab } from "./inventory-tab";
import { OverviewTab } from "./overview-tab";
import { PoliciesTab } from "./policies-tab";
import { RatesTab } from "./rates-tab";

const TAB_ICON: Record<HotelTab, LucideIcon> = {
  overview: LayoutDashboard,
  rates: CalendarRange,
  policies: ShieldCheck,
  inventory: Warehouse,
  quote: Calculator,
  contract: FileSignature,
};

type Props = {
  hotelId: string;
  repository: HotelRepository;
  documents: DocumentRepository;
};

/** Contracting workspace of one hotel: profile, rate matrix, policies, inventory, quotes, contract. */
export function HotelWorkspace({ hotelId, repository, documents }: Props) {
  const t = useTranslations("hotels");
  const canWrite = useCan("hotels.write");
  const canReadDocs = useCan("documents.read");
  const [tab, selectTab] = useHotelTab();
  const [editing, setEditing] = useState(false);
  const detail = useApiQuery(() => repository.get(hotelId), [repository, hotelId], { cacheKey: ["hotel", hotelId] });
  const refresh = () => void detail.refresh();
  const patchAllotment = (a: Allotment) =>
    detail.setData((d) => (d ? { ...d, allotments: d.allotments.map((x) => (x.id === a.id ? a : x)) } : d));

  if (detail.error && !detail.data) {
    return (
      <Screen>
        <QueryState error={detail.error} errorTitle={errorKind(detail.error) === "notFound" ? t("notFound") : undefined} onRetry={() => void detail.reload()}>
          {null}
        </QueryState>
      </Screen>
    );
  }

  if (!detail.data) {
    return (
      <Screen>
        <LoadingState variant="detail" label={t("loading")} />
      </Screen>
    );
  }

  const data = detail.data;
  const tabs = HOTEL_TABS.filter((k) => k !== "contract" || canReadDocs);

  return (
    <Screen>
      <Link href={routes.hotels} className="text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-950">
        <span className="rtl:hidden">←</span>
        <span className="hidden rtl:inline">→</span> {t("backToHotels")}
      </Link>

      <HotelHero detail={data} canWrite={canWrite} onEdit={() => setEditing(true)} />

      <Tabs value={tab} onValueChange={selectTab} className="mt-5">
        <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="h-auto w-max min-w-full gap-1 rounded-[22px] p-1.5" aria-label={t("title")}>
            {tabs.map((key) => {
              const Icon = TAB_ICON[key];
              const count = key === "rates" ? data.seasons.length : key === "inventory" ? data.allotments.length + data.stopSales.length : 0;
              return (
                <TabsTrigger key={key} value={key} className="group gap-2 rounded-2xl px-3.5 py-2.5 text-[13.5px]" data-testid={`hotel-tab-${key}`}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} aria-hidden />
                  {t(`tabs.${key}`)}
                  {count > 0 ? <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-600">{count}</span> : null}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab hotel={data.hotel} />
        </TabsContent>
        <TabsContent value="rates" className="mt-4">
          <RatesTab detail={data} repository={repository} canWrite={canWrite} onChanged={refresh} />
        </TabsContent>
        <TabsContent value="policies" className="mt-4">
          <PoliciesTab detail={data} repository={repository} canWrite={canWrite} onChanged={refresh} />
        </TabsContent>
        <TabsContent value="inventory" className="mt-4">
          <InventoryTab detail={data} repository={repository} canWrite={canWrite} onChanged={refresh} onAllotment={patchAllotment} />
        </TabsContent>
        <TabsContent value="quote" className="mt-4">
          <QuoteCalculator repository={repository} hotel={data.hotel} seasons={data.seasons} today={data.today} />
        </TabsContent>
        {canReadDocs ? (
          <TabsContent value="contract" className="mt-4">
            <ContractPanel hotelId={data.hotel.id} documents={documents} />
          </TabsContent>
        ) : null}
      </Tabs>

      <HotelFormDialog repository={repository} hotel={data.hotel} open={editing} onOpenChange={setEditing} onSaved={refresh} />
    </Screen>
  );
}
