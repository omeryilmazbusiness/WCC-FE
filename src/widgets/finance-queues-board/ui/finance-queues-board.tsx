"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  createPaymentRepository,
  FINANCE_QUEUES,
  type FinanceQueueItem,
  type FinanceQueueKind,
} from "@/entities/payment";
import { Link } from "@/shared/i18n/navigation";
import { routes } from "@/shared/config/routes";
import {
  Button,
  EmptyState,
  PageHeader,
  Screen,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from "@/shared/ui";

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(0)} ${currency}`;
  }
}

export function FinanceQueuesBoard() {
  const t = useTranslations("finance");
  const { push } = useToast();
  const repo = useMemo(() => createPaymentRepository(), []);
  const [kind, setKind] = useState<FinanceQueueKind>("overdue");
  const [items, setItems] = useState<FinanceQueueItem[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (k: FinanceQueueKind) => {
      setBusy(true);
      try {
        setItems(await repo.queue(k));
      } catch {
        push({ title: t("loadError"), tone: "error" });
      } finally {
        setBusy(false);
      }
    },
    [repo, push, t],
  );

  useEffect(() => {
    void load(kind);
  }, [kind, load]);

  async function exportCsv() {
    try {
      const blob = await repo.exportCsv(kind);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `finance-${kind}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      push({ title: t("exportError"), tone: "error" });
    }
  }

  async function onApprove(id?: string) {
    if (!id) return;
    try {
      await repo.approveRefund(id);
      push({ title: t("saved"), tone: "success" });
      await load(kind);
    } catch {
      push({ title: t("actionError"), tone: "error" });
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
            {busy ? (
              <p className="text-sm text-zinc-400">{t("loading")}</p>
            ) : items.length === 0 ? (
              <EmptyState title={t("queueEmpty")} description={t("queueEmptyHint")} />
            ) : (
              <ul className="space-y-4">
                {items.map((it, i) => (
                  <li
                    key={`${it.bookingId}-${it.paymentId ?? it.scheduleId ?? i}`}
                    className="flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-[15px] font-semibold text-zinc-900">
                        {money(it.amount, it.currency)}
                        {it.customerName ? ` · ${it.customerName}` : ""}
                      </p>
                      <p className="text-sm text-zinc-500">
                        {it.status}
                        {it.dueAt
                          ? ` · ${new Date(it.dueAt).toLocaleString()}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="secondary">
                        <Link href={routes.booking(it.bookingId)}>
                          {t("openBooking")}
                        </Link>
                      </Button>
                      {kind === "refunds" && it.paymentId ? (
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
            )}
          </TabsContent>
        ))}
      </Tabs>
    </Screen>
  );
}
