"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  createPaymentRepository,
  FINANCE_QUEUES,
  PaymentAmount,
  usePaymentErrorFeedback,
  type FinanceQueueKind,
} from "@/entities/payment";
import { useCan } from "@/entities/viewer";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { Link } from "@/shared/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { formatDateTime } from "@/shared/lib/format";
import {
  Button,
  PageHeader,
  QueryState,
  Screen,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/ui";

export function FinanceQueuesBoard() {
  const t = useTranslations("finance");
  const locale = useLocale();
  const feedback = usePaymentErrorFeedback();
  const canApprove = useCan("payments.approve");
  const repo = useMemo(() => createPaymentRepository(), []);
  const [kind, setKind] = useState<FinanceQueueKind>("overdue");
  const queue = useApiQuery(() => repo.queue(kind), [repo, kind], {
    liveTopics: ["payment", "booking"],
    cacheKey: ["finance-queue", kind],
  });
  const items = queue.data ?? [];

  async function exportCsv() {
    try {
      const blob = await repo.exportCsv(kind);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `finance-${kind}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      feedback.error(err, t("exportError"));
    }
  }

  async function onApprove(id?: string) {
    if (!id) return;
    try {
      await repo.approveRefund(id);
      feedback.success(t("saved"));
      await queue.reload();
    } catch (err) {
      feedback.error(err, t("actionError"));
    }
  }

  return (
    <Screen data-testid="finance-queues">
      <PageHeader
        title={t("queuesTitle")}
        description={t("queuesSubtitle")}
        actions={
          <Button variant="secondary" onClick={() => void exportCsv()}>
            {t("export")}
          </Button>
        }
      />

      <Tabs
        value={kind}
        onValueChange={(v) => setKind(v as FinanceQueueKind)}
        className="mt-2"
      >
        <TabsList>
          {FINANCE_QUEUES.map((k) => (
            <TabsTrigger key={k} value={k}>
              {t(`queues.${k}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        {FINANCE_QUEUES.map((k) => (
          <TabsContent key={k} value={k} className="mt-6">
            <QueryState
              loadingVariant="table"
              loading={queue.loading}
              loadingLabel={t("loading")}
              error={queue.error}
              onRetry={() => void queue.reload()}
              empty={items.length === 0}
              emptyTitle={t("queueEmpty")}
              emptyDescription={t("queueEmptyHint")}
            >
              <ul className="space-y-4">
                {items.map((it, i) => (
                  <li
                    key={`${it.bookingId}-${it.paymentId ?? it.scheduleId ?? i}`}
                    className="flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-[15px] font-semibold text-zinc-900">
                        <PaymentAmount
                          amount={it.amount}
                          currency={it.currency}
                          amountReporting={it.amountReporting}
                          reportingCurrency={it.reportingCurrency}
                        />
                        {it.customerName ? ` · ${it.customerName}` : ""}
                      </p>
                      <p className="text-sm text-zinc-500">
                        {it.status}
                        {it.dueAt
                          ? ` · ${formatDateTime(it.dueAt, locale)}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="secondary">
                        <Link href={routes.booking(it.bookingId)}>
                          {t("openBooking")}
                        </Link>
                      </Button>
                      {canApprove && kind === "refunds" && it.paymentId ? (
                        <Button
                          size="sm"
                          onClick={() => void onApprove(it.paymentId)}
                        >
                          {t("approve")}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </QueryState>
          </TabsContent>
        ))}
      </Tabs>
    </Screen>
  );
}
