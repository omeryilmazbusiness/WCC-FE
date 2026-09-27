"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import {
  createCustomerRepository,
  type CompanionLink,
  type Customer,
  type TimelineItem,
} from "@/entities/customer";
import { BookingStatusChip, createBookingRepository, type Booking } from "@/entities/booking";
import { useCan } from "@/entities/viewer";
import { EditCustomerDialog } from "@/features/edit-customer";
import { MergeCustomerDialog } from "@/features/merge-customer";
import { LinkCompanionDialog } from "@/features/link-companion";
import { formatDate, formatDateTime, formatMoney } from "@/shared/lib/format";
import { Link } from "@/shared/i18n/navigation";
import { routes } from "@/shared/config/routes";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  MaskedSecret,
  PageHeader,
  QueryState,
  Screen,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useMutationFeedback,
} from "@/shared/ui";
import { PrivacyMenu } from "./privacy-menu";

const repo = createCustomerRepository();
const bookingRepo = createBookingRepository();

type Props = { customerId: string };

export function Customer360View({ customerId }: Props) {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const tb = useTranslations("bookings");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const canWrite = useCan("customers.write");
  const canBookings = useCan("bookings.read");
  const canRevealPii = useCan("pii.read");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [companions, setCompanions] = useState<CompanionLink[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [tab, setTab] = useState("identity");

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [c, tl, comps, bks] = await Promise.all([
        repo.getById(customerId),
        repo.timeline(customerId),
        repo.listCompanions(customerId),
        canBookings ? bookingRepo.list({ customerId }) : Promise.resolve<Booking[]>([]),
      ]);
      setCustomer(c);
      setTimeline(tl);
      setCompanions(comps);
      setBookings(bks);
    } catch (err) {
      setError(err);
    }
  }, [customerId, canBookings]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const companionColumns = useMemo<ColumnDef<CompanionLink>[]>(
    () => [
      {
        id: "name",
        header: t("name"),
        cell: ({ row }) => {
          const name =
            row.original.Companion?.fullName ??
            row.original.companion?.full_name ??
            row.original.companion_id;
          return (
            <Link
              href={routes.customer(row.original.companion_id)}
              className="font-semibold underline-offset-4 hover:underline"
            >
              {name}
            </Link>
          );
        },
      },
      { accessorKey: "relation", header: t("relation") },
      {
        id: "actions",
        header: tc("actions"),
        cell: ({ row }) =>
          canWrite ? (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await repo.unlinkCompanion(customerId, row.original.companion_id);
                  feedback.success(t("companionRemoved"));
                  void refresh();
                } catch (err) {
                  feedback.error(err);
                }
              }}
            >
              {t("unlink")}
            </Button>
          ) : null,
      },
    ],
    [t, tc, customerId, feedback, refresh, canWrite],
  );

  const timelineColumns = useMemo<ColumnDef<TimelineItem>[]>(
    () => [
      {
        accessorKey: "occurred_at",
        header: t("when"),
        cell: ({ row }) => formatDateTime(row.original.occurred_at, locale),
      },
      {
        accessorKey: "kind",
        header: t("kind"),
        cell: ({ row }) => <Badge>{row.original.kind}</Badge>,
      },
      {
        accessorKey: "title",
        header: t("titleLabel"),
        cell: ({ row }) =>
          row.original.kind === "booking" ? (
            <Link
              href={routes.booking(row.original.id)}
              className="font-semibold underline-offset-4 hover:underline"
            >
              {row.original.title}
            </Link>
          ) : (
            row.original.title
          ),
      },
      {
        accessorKey: "status",
        header: t("status"),
        cell: ({ row }) => row.original.status || "—",
      },
    ],
    [t, locale],
  );

  const bookingColumns = useMemo<ColumnDef<Booking>[]>(
    () => [
      {
        accessorKey: "id",
        header: tb("fields.id"),
        cell: ({ row }) => (
          <Link
            href={routes.booking(row.original.id)}
            className="font-semibold underline-offset-4 hover:underline"
          >
            {row.original.id.slice(0, 8)}
          </Link>
        ),
      },
      {
        accessorKey: "status",
        header: tb("fields.status"),
        cell: ({ row }) => <BookingStatusChip status={row.original.status} />,
      },
      { accessorKey: "paxCount", header: tb("fields.pax") },
      {
        id: "balance",
        header: tb("fields.balance"),
        cell: ({ row }) =>
          formatMoney(row.original.balanceAmt, locale, row.original.currency),
      },
    ],
    [tb, locale],
  );

  if (error) {
    return (
      <Screen>
        <QueryState
          error={error}
          errorTitle={t("loadError")}
          retryLabel={tc("retry")}
          onRetry={() => void refresh()}
        >
          {null}
        </QueryState>
      </Screen>
    );
  }
  if (!customer) {
    return (
      <Screen>
        <p className="text-sm text-zinc-500">{tc("loading")}</p>
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader
        title={customer.fullName}
        description={customer.fullNameAr || undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            {customer.anonymizedAt ? (
              <Badge className="self-center bg-zinc-900 normal-case text-white">{t("anonymized")}</Badge>
            ) : null}
            {canWrite ? (
              <>
                <EditCustomerDialog
                  customer={customer}
                  repository={repo}
                  onSaved={() => {
                    feedback.success(t("updatedToast"));
                    void refresh();
                  }}
                />
                <MergeCustomerDialog
                  target={customer}
                  repository={repo}
                  onMerged={() => {
                    feedback.success(t("mergedToast"));
                    void refresh();
                  }}
                />
                <LinkCompanionDialog
                  customerId={customer.id}
                  repository={repo}
                  onLinked={() => {
                    feedback.success(t("companionLinked"));
                    void refresh();
                  }}
                />
              </>
            ) : null}
            <PrivacyMenu customer={customer} repository={repo} onAnonymized={() => void refresh()} />
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="identity">{t("identity")}</TabsTrigger>
          <TabsTrigger value="family">{t("family")}</TabsTrigger>
          <TabsTrigger value="bookings">{t("bookings")}</TabsTrigger>
          <TabsTrigger value="history">{t("history")}</TabsTrigger>
          <TabsTrigger value="conversations">{t("conversations")}</TabsTrigger>
          <TabsTrigger value="docs">{t("docs")}</TabsTrigger>
          <TabsTrigger value="payments">{t("payments")}</TabsTrigger>
          <TabsTrigger value="tasks">{t("tasksTab")}</TabsTrigger>
          <TabsTrigger value="notes">{t("notes")}</TabsTrigger>
          <TabsTrigger value="activity">{t("activity")}</TabsTrigger>
        </TabsList>

        <TabsContent value="identity" className="mt-4">
          <dl className="grid grid-cols-1 gap-x-10 gap-y-6 rounded-[24px] border border-zinc-200/80 bg-white p-6 text-sm sm:grid-cols-2 md:grid-cols-3">
            <Field label={t("phone")} value={customer.phone} />
            <Field label={t("email")} value={customer.email || "—"} />
            <Field label={t("nationality")} value={customer.nationality || "—"} />
            <Field
              label={t("passport")}
              value={
                <MaskedSecret
                  id={customer.id}
                  masked={customer.passportNo}
                  canReveal={canRevealPii}
                  onReveal={() => repo.revealPassport(customer.id)}
                />
              }
            />
            <Field
              label={t("dob")}
              value={
                customer.dateOfBirth
                  ? formatDate(customer.dateOfBirth, locale)
                  : "—"
              }
            />
            <Field
              label={t("specialReq")}
              value={customer.specialRequirements || "—"}
            />
            <Field
              label={t("notes")}
              value={customer.notes || "—"}
              className="col-span-full"
            />
          </dl>
        </TabsContent>

        <TabsContent value="family" className="mt-4">
          {companions.length === 0 ? (
            <EmptyState title={t("familyEmpty")} description={t("familyEmptyHint")} />
          ) : (
            <DataTable columns={companionColumns} data={companions} />
          )}
        </TabsContent>

        <TabsContent value="bookings" className="mt-4">
          {bookings.length === 0 ? (
            <EmptyState title={t("bookingsEmpty")} description={t("bookingsEmptyHint")} />
          ) : (
            <DataTable columns={bookingColumns} data={bookings} />
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <TimelineTable
            items={timeline.filter((i) => i.kind === "lead" || i.kind === "booking")}
            columns={timelineColumns}
            empty={t("historyEmpty")}
          />
        </TabsContent>

        <TabsContent value="conversations" className="mt-4">
          <EmptyState
            title={t("conversationsEmpty")}
            description={t("conversationsHint")}
          />
          <Link
            href={routes.inbox}
            className="mt-3 inline-block text-xs font-semibold text-sky-700 hover:underline"
          >
            {t("openInbox")}
          </Link>
        </TabsContent>

        <TabsContent value="docs" className="mt-4">
          <TimelineTable
            items={timeline.filter((i) => i.kind === "document")}
            columns={timelineColumns}
            empty={t("docsEmpty")}
          />
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <TimelineTable
            items={timeline.filter((i) => i.kind === "payment")}
            columns={timelineColumns}
            empty={t("paymentsEmpty")}
          />
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <TimelineTable
            items={timeline.filter((i) => i.kind === "task")}
            columns={timelineColumns}
            empty={t("tasksEmpty")}
          />
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <div className="rounded-[24px] border border-zinc-200/80 bg-white p-6 text-sm font-medium text-zinc-700 whitespace-pre-wrap">
            {customer.notes || t("notesEmpty")}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <TimelineTable
            items={timeline}
            columns={timelineColumns}
            empty={t("activityEmpty")}
          />
        </TabsContent>
      </Tabs>
    </Screen>
  );
}

function TimelineTable({
  items,
  columns,
  empty,
}: {
  items: TimelineItem[];
  columns: ColumnDef<TimelineItem>[];
  empty: string;
}) {
  if (items.length === 0) return <EmptyState title={empty} />;
  return <DataTable columns={columns} data={items} />;
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1.5 text-[15px] font-medium text-zinc-950">{value}</dd>
    </div>
  );
}
