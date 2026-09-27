"use client";

import { useTranslations } from "next-intl";
import { Banknote, Package, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { ListRow, WidgetCard, type Tone } from "@/shared/ui";
import { formatCompactMinor } from "./money";

type Row = { key: string; label: string; minor: number; icon: LucideIcon; tone: Tone };

type Props = {
  bookedMinor: number;
  collectedMinor: number;
  marginMinor: number;
  currency?: string;
  locale: string;
};

export function RevenueWidget({ bookedMinor, collectedMinor, marginMinor, currency, locale }: Props) {
  const t = useTranslations("manager");
  const rows: Row[] = [
    { key: "booked", label: t("kpi.booked"), minor: bookedMinor, icon: Package, tone: "sky" },
    { key: "collected", label: t("kpi.collected"), minor: collectedMinor, icon: Wallet, tone: "emerald" },
    { key: "margin", label: t("kpi.margin"), minor: marginMinor, icon: TrendingUp, tone: "violet" },
  ];

  return (
    <WidgetCard title={t("revenueTitle")} icon={Banknote} tone="teal" data-testid="manager-money-kpis">
      <ul className="flex flex-1 flex-col justify-center gap-2">
        {rows.map((row) => (
          <li key={row.key} className="h-[60px]">
            <ListRow
              icon={row.icon}
              tone={row.tone}
              title={row.label}
              trailing={
                <span className="text-xl font-semibold tabular-nums tracking-tight text-zinc-950">
                  {formatCompactMinor(row.minor, locale)}
                  {currency ? <span className="ms-1 text-xs font-semibold text-zinc-400">{currency}</span> : null}
                </span>
              }
            />
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}
