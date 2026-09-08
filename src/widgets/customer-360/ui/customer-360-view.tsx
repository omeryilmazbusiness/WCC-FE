"use client";

import { useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import type { Booking } from "@/entities/booking";
import type { Customer } from "@/entities/customer";
import type { Lead } from "@/entities/lead";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { DataTable } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";
import { Screen } from "@/shared/ui/screen";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

type Props = {
  customer: Customer;
  leads: Lead[];
  bookings: Booking[];
};

export function Customer360View({ customer, leads, bookings }: Props) {
  const t = useTranslations("customers");

  const leadColumns: ColumnDef<Lead>[] = [
    { accessorKey: "fullName", header: "Name" },
    { accessorKey: "phone", header: "Phone" },
    {
      accessorKey: "stage",
      header: "Stage",
      cell: ({ row }) => <Badge>{row.original.stage}</Badge>,
    },
  ];

  const bookingColumns: ColumnDef<Booking>[] = [
    { accessorKey: "id", header: "ID" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge>{row.original.status}</Badge>,
    },
    { accessorKey: "paxCount", header: "Pax" },
    {
      id: "balance",
      header: "Balance",
      cell: ({ row }) =>
        `${row.original.balanceAmt} ${row.original.currency}`,
    },
  ];

  return (
    <Screen>
      <PageHeader
        title={customer.fullName}
        description={customer.fullNameAr || undefined}
      />

      <Tabs defaultValue="identity">
        <TabsList>
          <TabsTrigger value="identity">{t("identity")}</TabsTrigger>
          <TabsTrigger value="leads">{t("leads")}</TabsTrigger>
          <TabsTrigger value="bookings">{t("bookings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="identity">
          <Card>
            <CardHeader>
              <CardTitle>{t("identity")}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-x-10 gap-y-6 text-sm sm:grid-cols-2 md:grid-cols-3">
                <Field label="Phone" value={customer.phone} />
                <Field label="Email" value={customer.email || "—"} />
                <Field label="Nationality" value={customer.nationality || "—"} />
                <Field
                  label="Notes"
                  value={customer.notes || "—"}
                  className="col-span-full"
                />
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads">
          <DataTable columns={leadColumns} data={leads} emptyMessage={t("empty")} />
        </TabsContent>

        <TabsContent value="bookings">
          <DataTable
            columns={bookingColumns}
            data={bookings}
            emptyMessage={t("empty")}
          />
        </TabsContent>
      </Tabs>
    </Screen>
  );
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
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
