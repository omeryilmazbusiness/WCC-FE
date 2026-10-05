"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Activity, FileText, Map as MapIcon, Users, Wallet, type LucideIcon } from "lucide-react";
import {
  createBookingRepository,
  createBookingWorkspaceRepository,
  type Booking,
  type BookingRepository,
  type BookingWorkspaceRepository,
  type DocumentKind,
} from "@/entities/booking";
import { createCustomerRepository } from "@/entities/customer";
import { createTourPackageRepository } from "@/entities/tourpackage";
import { ShareBookingDialog } from "@/features/booking-actions";
import { cn } from "@/shared/lib/cn";
import { LoadingState, QueryState, Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui";
import { toDocumentData } from "../model/document-data";
import { useBookingWorkspace } from "../model/use-booking-workspace";
import { useCompanyBrand } from "../model/use-company-brand";
import { ActivityTab } from "./activity-tab";
import { DocumentsTab } from "./documents-tab";
import { FinanceTab } from "./finance-tab";
import { ItineraryTab } from "./itinerary-tab";
import { PaxTab } from "./pax-tab";
import { QuickActionBar } from "./quick-action-bar";
import { WorkspaceHeader } from "./workspace-header";

export const WORKSPACE_TABS = ["itinerary", "pax", "finance", "documents", "activity"] as const;
export type WorkspaceTab = (typeof WORKSPACE_TABS)[number];

const TAB_ICON: Record<WorkspaceTab, LucideIcon> = {
  itinerary: MapIcon,
  pax: Users,
  finance: Wallet,
  documents: FileText,
  activity: Activity,
};

type Props = {
  bookingId: string;
  variant: "drawer" | "page";
  repository?: BookingRepository;
  workspace?: BookingWorkspaceRepository;
  /** Notified after any change so a surrounding list can refresh. */
  onChanged?: (booking: Booking | null) => void;
  initialTab?: WorkspaceTab;
};

export function BookingWorkspace({ bookingId, variant, repository, workspace, onChanged, initialTab = "itinerary" }: Props) {
  const t = useTranslations("bookingWorkspace");
  const tc = useTranslations("common");
  const [repos] = useState(() => ({
    bookings: repository ?? createBookingRepository(),
    workspace: workspace ?? createBookingWorkspaceRepository(),
    customers: createCustomerRepository(),
    packages: createTourPackageRepository(),
  }));
  const state = useBookingWorkspace(bookingId, repos);
  const brand = useCompanyBrand();
  const [tab, setTab] = useState<WorkspaceTab>(initialTab);
  const [activityVersion, setActivityVersion] = useState(0);
  const [shareDoc, setShareDoc] = useState<DocumentKind | null>(null);

  const changed = (b: Booking | null) => {
    state.apply(b);
    setActivityVersion((v) => v + 1);
    onChanged?.(b);
  };
  const bumpActivity = () => setActivityVersion((v) => v + 1);

  const docData = useMemo(
    () =>
      state.booking
        ? toDocumentData({
            booking: state.booking,
            participants: state.participants,
            lines: state.lines,
            pkg: state.pkg,
            contact: state.contact,
            company: brand,
          })
        : null,
    [state.booking, state.participants, state.lines, state.pkg, state.contact, brand],
  );

  if (state.error && !state.booking) {
    return (
      <QueryState error={state.error} errorTitle={t("header.loadError")} retryLabel={tc("retry")} onRetry={() => void state.refresh()}>
        {null}
      </QueryState>
    );
  }
  if (!state.booking || !docData) return <LoadingState variant="detail" label={tc("loading")} />;
  const booking = state.booking;

  return (
    <div className={cn("space-y-4", variant === "drawer" && "px-4 pb-6 pt-2 sm:px-6")} data-testid="booking-workspace">
      <WorkspaceHeader booking={booking} variant={variant} />
      <QuickActionBar
        booking={booking}
        contact={state.contact}
        companyName={brand.name}
        repository={repos.bookings}
        workspace={repos.workspace}
        onBooking={changed}
        onActivity={bumpActivity}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as WorkspaceTab)}>
        <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-[20px] p-1.5 [scrollbar-width:none]">
          {WORKSPACE_TABS.map((key) => {
            const Icon = TAB_ICON[key];
            return (
              <TabsTrigger key={key} value={key} className="gap-1.5 rounded-[14px] px-3.5" data-testid={`booking-tab-${key}-trigger`}>
                <Icon className="h-4 w-4" aria-hidden />
                {t(`tabs.${key}`)}
                {key === "activity" && booking.info.openChanges > 0 ? (
                  <span className="rounded-full bg-amber-500 px-1.5 text-[10.5px] font-bold text-white">{booking.info.openChanges}</span>
                ) : null}
              </TabsTrigger>
            );
          })}
        </TabsList>
        <TabsContent value="itinerary" className="mt-4">
          <ItineraryTab booking={booking} pkg={state.pkg} lines={state.lines} />
        </TabsContent>
        <TabsContent value="pax" className="mt-4">
          <PaxTab
            booking={booking}
            participants={state.participants}
            checklist={state.checklist}
            readiness={state.readiness}
            repository={repos.bookings}
            onChanged={() => changed(null)}
          />
        </TabsContent>
        <TabsContent value="finance" className="mt-4">
          <FinanceTab booking={booking} lines={state.lines} repository={repos.bookings} onBooking={changed} />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <DocumentsTab data={docData} onShare={setShareDoc} />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityTab bookingId={booking.id} workspace={repos.workspace} version={activityVersion} onChanged={() => changed(null)} />
        </TabsContent>
      </Tabs>

      <ShareBookingDialog
        booking={booking}
        contact={state.contact}
        companyName={brand.name}
        workspace={repos.workspace}
        open={shareDoc !== null}
        onOpenChange={(open) => !open && setShareDoc(null)}
        onShared={bumpActivity}
        defaultDocument={shareDoc ?? "summary"}
      />
    </div>
  );
}
