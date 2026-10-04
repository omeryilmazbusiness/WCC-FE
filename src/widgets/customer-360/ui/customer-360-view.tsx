"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  CalendarPlus,
  FileText,
  GitMerge,
  History,
  LayoutGrid,
  ListTodo,
  Plane,
  ShieldOff,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { TimelineItem } from "@/entities/customer";
import { useCan } from "@/entities/viewer";
import { CreateBookingDialog } from "@/features/create-booking";
import { CustomerFormDialog } from "@/features/customer-form";
import { routes } from "@/shared/config/routes";
import { Link, useRouter } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import {
  Bone,
  EmptyState,
  LoadingState,
  QueryState,
  Screen,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useMutationFeedback,
} from "@/shared/ui";
import { bookingRepository, customerRepository, useCustomer360 } from "../model/use-customer-360";
import { useProfileTab, type ProfileTab } from "../model/use-profile-tab";
import { BookingsTab } from "./bookings-tab";
import { CustomerActionsMenu } from "./customer-actions-menu";
import { FamilyTab } from "./family-tab";
import { OverviewTab } from "./overview-tab";
import { ProfileHero, QuickActionButton } from "./profile-hero";
import { TimelineList } from "./timeline-list";

type Props = { customerId: string };

const TAB_ICON: Record<ProfileTab, LucideIcon> = {
  overview: LayoutGrid,
  family: UsersRound,
  bookings: Plane,
  payments: Wallet,
  documents: FileText,
  tasks: ListTodo,
  activity: History,
};

/** Customer profile: hero with the essentials, then one tab per area of the relationship. */
export function Customer360View({ customerId }: Props) {
  const t = useTranslations("customers.profile");
  const tc = useTranslations("common");
  const feedback = useMutationFeedback();
  const router = useRouter();
  const canWrite = useCan("customers.write");
  const canWriteBookings = useCan("bookings.write");
  const canRevealPii = useCan("pii.read");
  const data = useCustomer360(customerId);
  const [tab, selectTab] = useProfileTab();
  const [editing, setEditing] = useState(false);
  const customer = data.customer.data;

  if (data.customer.error && !customer) {
    return (
      <Screen>
        <BackLink label={t("back")} />
        <QueryState error={data.customer.error} errorTitle={t("loadError")} retryLabel={tc("retry")} onRetry={() => void data.customer.reload()}>
          {null}
        </QueryState>
      </Screen>
    );
  }
  if (!customer) {
    return (
      <Screen>
        <BackLink label={t("back")} />
        <LoadingState variant="detail" label={tc("loading")} />
      </Screen>
    );
  }

  const anonymized = Boolean(customer.anonymizedAt);
  const byKind = (kind: string) => data.timeline.filter((i) => i.kind === kind);
  const payments = byKind("payment");
  const documents = byKind("document");
  const tasks = byKind("task");
  const counts: Partial<Record<ProfileTab, number>> = {
    family: data.companions.length,
    bookings: data.canBookings ? data.bookings.length : undefined,
    payments: payments.length,
    documents: documents.length,
    tasks: data.stats.openTasks || undefined,
  };
  const tabs = (["overview", "family", "bookings", "payments", "documents", "tasks", "activity"] as const).filter(
    (k) => k !== "bookings" || data.canBookings,
  );

  const bookingDialog = (trigger: ReactElement) =>
    canWriteBookings && !anonymized ? (
      <CreateBookingDialog
        repository={bookingRepository}
        defaultCustomerId={customer.id}
        onCreated={(bookingId) => router.push(routes.booking(bookingId))}
        trigger={trigger}
      />
    ) : null;

  return (
    <Screen data-testid="customer-360">
      <BackLink label={t("back")} />

      {customer.mergedIntoId ? (
        <Banner icon={GitMerge} tone="violet">
          {t("mergedBanner")}{" "}
          <Link href={routes.customer(customer.mergedIntoId)} className="font-semibold underline underline-offset-4">
            {t("openMerged")}
          </Link>
        </Banner>
      ) : null}
      {anonymized ? <Banner icon={ShieldOff} tone="zinc">{t("anonymizedBanner")}</Banner> : null}

      <ProfileHero
        customer={customer}
        stats={data.stats}
        canWrite={canWrite}
        onEdit={() => setEditing(true)}
        bookingAction={bookingDialog(<QuickActionButton icon={CalendarPlus} tone="sky" label={t("newBooking")} data-testid="customer-new-booking" />)}
        menu={
          <CustomerActionsMenu
            customer={customer}
            repository={customerRepository}
            onLinked={() => {
              feedback.success(t("family.linked"));
              void data.refreshCompanions();
            }}
            onMerged={() => {
              feedback.success(t("merged"));
              void data.reloadAll();
            }}
            onAnonymized={() => void data.reloadAll()}
          />
        }
      />

      <Tabs value={tab} onValueChange={selectTab} className="mt-5">
        <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="h-auto w-max min-w-full gap-1 rounded-[22px] p-1.5" aria-label={t("tabsLabel")}>
            {tabs.map((key) => {
              const Icon = TAB_ICON[key];
              const count = counts[key];
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="group gap-2 rounded-2xl px-3.5 py-2.5 text-[13.5px]"
                  data-testid={`customer-tab-${key}`}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} aria-hidden />
                  {t(`tabs.${key}`)}
                  {count ? (
                    <span className="rounded-full bg-zinc-100 px-1.5 py-px text-[11px] font-semibold tabular-nums text-zinc-500 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">
                      {count}
                    </span>
                  ) : null}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab
            customer={customer}
            repository={customerRepository}
            canRevealPii={canRevealPii}
            canWrite={canWrite}
            companions={data.companions}
            timeline={data.timeline}
            onEdit={() => setEditing(true)}
            onOpenTab={selectTab}
          />
        </TabsContent>

        <TabsContent value="family" className="mt-4">
          {data.companionsLoading ? (
            <ListSkeleton />
          ) : (
            <FamilyTab
              customerId={customer.id}
              companions={data.companions}
              repository={customerRepository}
              canWrite={canWrite && !anonymized}
              onChanged={() => void data.refreshCompanions()}
            />
          )}
        </TabsContent>

        {data.canBookings ? (
          <TabsContent value="bookings" className="mt-4">
            {data.bookingsLoading ? (
              <ListSkeleton />
            ) : (
              <BookingsTab
                bookings={data.bookings}
                action={bookingDialog(
                  <button
                    type="button"
                    className="inline-flex h-10 items-center gap-2 rounded-2xl bg-zinc-950 px-4 text-[13px] font-semibold text-white transition hover:bg-zinc-800"
                  >
                    <CalendarPlus className="h-4 w-4" aria-hidden />
                    {t("newBooking")}
                  </button>,
                )}
              />
            )}
          </TabsContent>
        ) : null}

        <TimelineTab value="payments" loading={data.timelineLoading} items={payments} icon={Wallet} empty={t("empty.payments")} />
        <TimelineTab value="documents" loading={data.timelineLoading} items={documents} icon={FileText} empty={t("empty.documents")} />
        <TimelineTab value="tasks" loading={data.timelineLoading} items={tasks} icon={ListTodo} empty={t("empty.tasks")} />
        <TimelineTab value="activity" loading={data.timelineLoading} items={data.timeline} icon={History} empty={t("empty.activity")} />
      </Tabs>

      <CustomerFormDialog
        repository={customerRepository}
        customer={customer}
        open={editing}
        onOpenChange={setEditing}
        onSaved={({ customer: saved }) => {
          data.customer.setData(saved);
          feedback.success(t("updated"));
          void data.customer.refresh();
        }}
      />
    </Screen>
  );
}

function TimelineTab({ value, loading, items, icon, empty }: { value: ProfileTab; loading: boolean; items: TimelineItem[]; icon: LucideIcon; empty: string }) {
  return (
    <TabsContent value={value} className="mt-4">
      {loading ? <ListSkeleton /> : items.length === 0 ? <EmptyState icon={icon} title={empty} /> : <TimelineList items={items} data-testid={`customer-${value}`} />}
    </TabsContent>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <Bone key={i} className="h-[72px] rounded-[24px]" />
      ))}
    </div>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link
      href={routes.customers}
      className="mb-3 inline-flex h-9 items-center gap-1.5 rounded-xl px-2 text-[13px] font-semibold text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
      data-testid="customer-back"
    >
      <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
      {label}
    </Link>
  );
}

function Banner({ icon: Icon, tone, children }: { icon: LucideIcon; tone: "violet" | "zinc"; children: ReactNode }) {
  return (
    <div
      className={cn(
        "mb-3 flex items-center gap-2.5 rounded-[20px] px-4 py-3 text-[13px] font-medium",
        tone === "violet" ? "bg-violet-50 text-violet-900" : "bg-zinc-100 text-zinc-700",
      )}
      role="status"
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <p>{children}</p>
    </div>
  );
}
