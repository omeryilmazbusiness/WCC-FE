"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeftRight,
  BadgeDollarSign,
  BookCheck,
  Inbox,
  Landmark,
  LayoutDashboard,
  PiggyBank,
  Scale,
  TrendingUp,
  Users,
  Vault,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { bpsToPercent, type FinanceRepository } from "@/entities/finance";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { formatMoneyShort, formatPercent } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { Button, PageHeader, Screen, Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui";
import { FINANCE_TABS, useFinanceTab, type FinanceTab } from "../model/use-finance-tab";
import { HeroTile } from "./primitives";
import { OverviewTab } from "./overview-tab";
import { ReceivablesTab } from "./receivables-tab";
import { PayablesTab } from "./payables-tab";
import { TreasuryTab } from "./treasury-tab";
import { ProfitTab } from "./profit-tab";
import { ReconciliationTab } from "./reconciliation-tab";

const TAB_ICON: Record<FinanceTab, LucideIcon> = {
  overview: LayoutDashboard,
  receivables: Users,
  payables: Landmark,
  treasury: Vault,
  profit: TrendingUp,
  reconciliation: Scale,
  queues: Inbox,
};

type Props = { repository: FinanceRepository; queues: ReactNode };

/** Finance hub: executive position on top, one tab per finance layer underneath. */
export function FinanceHub({ repository, queues }: Props) {
  const t = useTranslations("financeHub");
  const locale = useLocale();
  const [tab, selectTab] = useFinanceTab();
  const overview = useApiQuery(() => repository.overview(), [repository], { cacheKey: ["finance", "overview"], liveTopics: ["payment", "booking"] });
  const refreshOverview = () => void overview.refresh();
  const o = overview.data;
  const cur = o?.reportingCurrency ?? "SAR";
  const money = (v: number | undefined) => (o && v !== undefined ? formatMoneyShort(v, locale, cur) : "–");
  const partial = (p?: boolean) => (p ? t("hero.partial") : undefined);

  return (
    <Screen data-testid="finance-hub">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Button asChild variant="secondary">
            <Link href={routes.financeFx}>
              <ArrowLeftRight className="h-4 w-4" aria-hidden />
              {t("fxRates")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3.5 sm:grid-cols-2 2xl:grid-cols-4" data-testid="finance-hero">
        <HeroTile
          icon={Wallet}
          tone="emerald"
          label={t("hero.cash")}
          value={money(o?.cash.total)}
          caption={partial(o?.cash.partial) ?? t("hero.cashHint", { count: o?.cash.items.length ?? 0 })}
          onClick={() => selectTab("treasury")}
          testId="hero-cash"
        />
        <HeroTile
          icon={Scale}
          tone={o && o.netPosition < 0 ? "rose" : "indigo"}
          label={t("hero.net")}
          value={money(o?.netPosition)}
          caption={o ? t("hero.netHint", { ar: formatMoneyShort(o.receivables.total, locale, cur), ap: formatMoneyShort(o.payables.total, locale, cur) }) : undefined}
          onClick={() => selectTab("receivables")}
          testId="hero-net"
        />
        <HeroTile
          icon={BadgeDollarSign}
          tone="violet"
          label={t("hero.month")}
          value={money(o?.month.revenue)}
          caption={o ? t("hero.monthHint", { margin: formatMoneyShort(o.month.margin, locale, cur), pct: formatPercent(bpsToPercent(o.monthMarginBps), locale) }) : undefined}
          onClick={() => selectTab("profit")}
          testId="hero-month"
        />
        <HeroTile
          icon={PiggyBank}
          tone={o && o.alerts.lowDeposits > 0 ? "amber" : "sky"}
          label={t("hero.deposits")}
          value={money(o?.deposits.total)}
          caption={o && o.alerts.lowDeposits > 0 ? t("hero.depositsLow", { count: o.alerts.lowDeposits }) : partial(o?.deposits.partial)}
          onClick={() => selectTab("payables")}
          testId="hero-deposits"
        />
      </div>

      <Tabs value={tab} onValueChange={selectTab} className="mt-6">
        <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="h-auto w-max min-w-full gap-1 rounded-[22px] p-1.5" aria-label={t("title")}>
            {FINANCE_TABS.map((key) => {
              const Icon = TAB_ICON[key];
              const badge = badgeFor(key, o?.alerts);
              return (
                <TabsTrigger key={key} value={key} className="gap-2 rounded-2xl px-3.5 py-2.5 text-[13.5px]" data-testid={`finance-tab-${key}`}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} aria-hidden />
                  {t(`tabs.${key}`)}
                  {badge > 0 ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-rose-700">{badge}</span> : null}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab query={overview} onOpen={selectTab} />
        </TabsContent>
        <TabsContent value="receivables" className="mt-4">
          <ReceivablesTab repository={repository} onChanged={refreshOverview} />
        </TabsContent>
        <TabsContent value="payables" className="mt-4">
          <PayablesTab repository={repository} onChanged={refreshOverview} />
        </TabsContent>
        <TabsContent value="treasury" className="mt-4">
          <TreasuryTab repository={repository} onChanged={refreshOverview} />
        </TabsContent>
        <TabsContent value="profit" className="mt-4">
          <ProfitTab repository={repository} />
        </TabsContent>
        <TabsContent value="reconciliation" className="mt-4">
          <ReconciliationTab repository={repository} onChanged={refreshOverview} />
        </TabsContent>
        <TabsContent value="queues" className="mt-4">
          {queues}
        </TabsContent>
      </Tabs>
      <p className="mt-6 flex items-center gap-1.5 text-[12px] text-zinc-400">
        <BookCheck className="h-3.5 w-3.5" aria-hidden />
        {t("footnote")}
      </p>
    </Screen>
  );
}

function badgeFor(tab: FinanceTab, a: { unmatchedCredits: number; lowDeposits: number; supplierDueSoon: number; suspendedAgencies: number } | undefined): number {
  if (!a) return 0;
  switch (tab) {
    case "treasury":
      return a.unmatchedCredits;
    case "payables":
      return a.lowDeposits + a.supplierDueSoon;
    case "receivables":
      return a.suspendedAgencies;
    default:
      return 0;
  }
}
