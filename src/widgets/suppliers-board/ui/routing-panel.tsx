"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Crown, Route } from "lucide-react";
import {
  AvailabilityBadges,
  CATEGORY_LOOK,
  PRODUCTS,
  PRODUCT_LOOK,
  bpsToPercent,
  supplierName,
  type Product,
  type SupplierRepository,
} from "@/entities/supplier";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { EmptyState, QueryState, TONES } from "@/shared/ui";

type Props = { repository: SupplierRepository; version?: unknown };

/** Live smart-routing order per product: open suppliers ranked by health, funding, latency and contract. */
export function RoutingPanel({ repository, version }: Props) {
  const t = useTranslations("suppliers.routing");
  const ts = useTranslations("suppliers");
  const locale = useLocale();
  const [product, setProduct] = useState<Product>("flight");
  const query = useApiQuery(() => repository.routing(product), [repository, product, version], { cacheKey: ["supplier-routing", product] });
  const options = query.data ?? [];
  const firstOpen = options.findIndex((o) => o.availability.bookable);

  return (
    <section className="rounded-[28px] border border-zinc-200/60 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]" data-testid="supplier-routing">
      <header className="mb-3 flex items-center gap-3">
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]", TONES.indigo.gradient)} aria-hidden>
          <Route className="h-6 w-6" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold tracking-tight text-zinc-950">{t("title")}</h2>
          <p className="text-[12px] font-medium text-zinc-500">{t("subtitle")}</p>
        </div>
      </header>

      <div className="mb-3 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={t("product")}>
        {PRODUCTS.map((p) => {
          const look = PRODUCT_LOOK[p];
          const Icon = look.icon;
          const active = p === product;
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setProduct(p)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11.5px] font-semibold transition",
                active ? "bg-zinc-950 text-white shadow-[0_10px_22px_-14px_rgba(15,23,42,0.9)]" : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100",
              )}
              data-testid={`routing-product-${p}`}
            >
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", active ? "bg-white/15" : TONES[look.tone].soft)} aria-hidden>
                <Icon className="h-4 w-4" />
              </span>
              {ts(`product.${p}`)}
            </button>
          );
        })}
      </div>

      <QueryState loading={query.loading && !query.data} error={query.error} onRetry={() => void query.reload()}>
        {options.length === 0 ? (
          <EmptyState icon={Route} title={t("empty")} description={t("emptyHint")} />
        ) : (
          <ol className="space-y-2" data-testid="routing-options">
            {options.map((o, i) => {
              const look = CATEGORY_LOOK[o.category];
              const Icon = look.icon;
              const primary = i === firstOpen;
              return (
                <li key={o.supplierId}>
                  <Link
                    href={routes.supplier(o.supplierId)}
                    className={cn(
                      "flex items-center gap-3 rounded-[20px] p-2.5 transition",
                      primary ? "bg-gradient-to-br from-indigo-50 via-white to-white ring-1 ring-inset ring-indigo-200" : "hover:bg-zinc-50",
                      !o.availability.bookable && "opacity-60",
                    )}
                  >
                    <span className="w-5 shrink-0 text-center text-[13px] font-bold tabular-nums text-zinc-400">{i + 1}</span>
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]", TONES[look.tone].soft)} aria-hidden>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold text-zinc-900">
                        {primary ? <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-label={t("primary")} /> : null}
                        <bdi className="truncate">{supplierName(o, locale)}</bdi>
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        {o.availability.bookable ? (
                          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100" aria-hidden>
                            <span className={cn("block h-full rounded-full", o.score >= 70 ? "bg-emerald-500" : o.score >= 40 ? "bg-amber-500" : "bg-rose-500")} style={{ width: `${o.score}%` }} />
                          </span>
                        ) : (
                          <AvailabilityBadges availability={o.availability} compact />
                        )}
                        {o.markupBps > 0 ? <span className="text-[11px] font-semibold text-zinc-500">+{bpsToPercent(o.markupBps)}%</span> : null}
                      </span>
                    </span>
                    {o.availability.bookable ? (
                      <span className="shrink-0 text-end">
                        <span className="block text-[17px] font-bold leading-none tabular-nums text-zinc-900">{o.score}</span>
                        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-zinc-400">{t("score")}</span>
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </QueryState>
    </section>
  );
}
