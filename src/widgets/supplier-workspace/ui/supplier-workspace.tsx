"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Activity, ClipboardList, Globe, LayoutDashboard, ReceiptText, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import type { DocumentRepository } from "@/entities/document";
import type { Dispute, Supplier, SupplierRepository } from "@/entities/supplier";
import { useCan } from "@/entities/viewer";
import { SupplierFormDialog } from "@/features/supplier-form";
import { SupplierInvoicesPanel } from "@/features/supplier-invoices";
import { SupplierIssueLogPanel, SupplierLinksPanel } from "@/features/supplier-operations";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { LoadingState, QueryState, Screen, Tabs, TabsContent, TabsList, TabsTrigger, errorKind, useMutationFeedback } from "@/shared/ui";
import { SUPPLIER_TABS, useSupplierTab, type SupplierTab } from "../model/use-supplier-tab";
import { FinanceTab } from "./finance-tab";
import { IntegrationTab } from "./integration-tab";
import { OverviewTab } from "./overview-tab";
import { PerformanceTab } from "./performance-tab";
import { ScopeTab } from "./scope-tab";
import { SupplierHero } from "./supplier-hero";

const TAB_ICON: Record<SupplierTab, LucideIcon> = {
  overview: LayoutDashboard,
  integration: Activity,
  finance: Wallet,
  scope: Globe,
  performance: TrendingUp,
  operations: ClipboardList,
  invoices: ReceiptText,
};

type Props = {
  supplierId: string;
  repository: SupplierRepository;
  documents: DocumentRepository;
};

/** One supplier: profile, API health, account & ledger, scope & papers, performance, operations, invoices. */
export function SupplierWorkspace({ supplierId, repository, documents }: Props) {
  const t = useTranslations("suppliers");
  const feedback = useMutationFeedback();
  const canWrite = useCan("suppliers.write");
  const canFinance = useCan("suppliers.finance");
  const canReadDocs = useCan("documents.read");
  const [tab, selectTab] = useSupplierTab();
  const [editing, setEditing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const detail = useApiQuery(() => repository.get(supplierId), [repository, supplierId], { cacheKey: ["supplier", supplierId] });

  const patchSupplier = (s: Supplier) => detail.setData((d) => (d ? { ...d, supplier: s } : d));
  const patchDispute = (dispute: Dispute) =>
    detail.setData((d) => {
      if (!d) return d;
      const exists = d.disputes.some((x) => x.id === dispute.id);
      const disputes = exists ? d.disputes.map((x) => (x.id === dispute.id ? dispute : x)) : [dispute, ...d.disputes];
      return { ...d, disputes, openDisputes: disputes.filter((x) => x.status === "open").length };
    });

  async function toggleActive() {
    if (!detail.data) return;
    const next = !detail.data.supplier.isActive;
    setToggling(true);
    try {
      patchSupplier(await repository.setActive(supplierId, next));
      feedback.success(next ? t("hero.activated") : t("hero.deactivated"));
    } catch (e) {
      feedback.error(e, t("form.saveError"));
    } finally {
      setToggling(false);
    }
  }

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
  const s = data.supplier;

  return (
    <Screen>
      <Link href={routes.suppliers} className="text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-950">
        <span className="rtl:hidden">←</span>
        <span className="hidden rtl:inline">→</span> {t("backToSuppliers")}
      </Link>

      <SupplierHero detail={data} canWrite={canWrite} toggling={toggling} onEdit={() => setEditing(true)} onToggleActive={() => void toggleActive()} />

      <Tabs value={tab} onValueChange={selectTab} className="mt-5">
        <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="h-auto w-max min-w-full gap-1 rounded-[22px] p-1.5" aria-label={t("title")}>
            {SUPPLIER_TABS.map((key) => {
              const Icon = TAB_ICON[key];
              const count = key === "performance" ? data.openDisputes : 0;
              return (
                <TabsTrigger key={key} value={key} className="group gap-2 rounded-2xl px-3.5 py-2.5 text-[13.5px]" data-testid={`supplier-tab-${key}`}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} aria-hidden />
                  {t(`tabs.${key}`)}
                  {count > 0 ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-rose-700">{count}</span> : null}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab supplier={s} />
        </TabsContent>
        <TabsContent value="integration" className="mt-4">
          <IntegrationTab detail={data} repository={repository} canWrite={canWrite} onSupplier={patchSupplier} />
        </TabsContent>
        <TabsContent value="finance" className="mt-4">
          <FinanceTab
            detail={data}
            repository={repository}
            canFinance={canFinance}
            onPosted={(entry, supplier) => detail.setData((d) => (d ? { ...d, supplier, ledger: [entry, ...d.ledger] } : d))}
          />
        </TabsContent>
        <TabsContent value="scope" className="mt-4">
          <ScopeTab supplier={s} documents={documents} canReadDocs={canReadDocs} />
        </TabsContent>
        <TabsContent value="performance" className="mt-4">
          <PerformanceTab detail={data} repository={repository} canWrite={canWrite} onDispute={patchDispute} />
        </TabsContent>
        <TabsContent value="operations" className="mt-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <SupplierLinksPanel supplier={s} repository={repository} />
            <SupplierIssueLogPanel supplierId={s.id} repository={repository} />
          </div>
        </TabsContent>
        <TabsContent value="invoices" className="mt-4">
          <SupplierInvoicesPanel supplier={s} repository={repository} />
        </TabsContent>
      </Tabs>

      <SupplierFormDialog
        repository={repository}
        supplier={s}
        credentials={data.credentials}
        open={editing}
        onOpenChange={setEditing}
        onSaved={() => void detail.refresh()}
      />
    </Screen>
  );
}
