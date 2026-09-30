"use client";

import { useTranslations } from "next-intl";
import { Banknote, RotateCw } from "lucide-react";
import type { RevenueSummary } from "@/entities/dashboard";
import { cn } from "@/shared/lib/cn";
import { TONES } from "@/shared/ui";
import { RevenueWidget } from "./revenue-widget";

type Props = {
  data: RevenueSummary | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  locale: string;
  periodDays: number;
};

/** Revenue card with its own loading and error shell so a finance failure never hides the dashboard. */
export function RevenueCardState({ data, loading, error, onRetry, locale, periodDays }: Props) {
  const t = useTranslations("manager.revenue");
  if (data) return <RevenueWidget revenue={data} locale={locale} periodDays={periodDays} />;
  return (
    <section
      className="flex h-full min-h-[260px] flex-col rounded-[28px] border border-zinc-200/60 bg-white p-5 shadow-[0_10px_34px_-24px_rgba(15,23,42,0.35)] sm:p-6"
      data-testid="manager-revenue"
      aria-busy={loading}
    >
      <header className="flex items-center gap-3">
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]", TONES.teal.gradient)}>
          <Banknote className="h-6 w-6" strokeWidth={1.9} />
        </span>
        <h2 className="text-[17px] font-semibold tracking-tight text-zinc-950">{t("title")}</h2>
      </header>
      {error && !loading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm font-medium text-zinc-500">{t("error")}</p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800"
          >
            <RotateCw className="h-3.5 w-3.5" strokeWidth={2.25} />
            {t("retry")}
          </button>
        </div>
      ) : (
        <div className="mt-5 grid flex-1 gap-3">
          <div className="h-28 animate-pulse rounded-[22px] bg-zinc-100" />
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-[20px] bg-zinc-50" />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
