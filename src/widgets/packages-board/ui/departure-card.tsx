"use client";

import { useTranslations } from "next-intl";
import type { Departure, TourPackageRepository } from "@/entities/tourpackage";
import { CloneDepartureDialog } from "@/features/clone-departure";
import { CapacityBadge, Card, CardContent } from "@/shared/ui";

type Props = {
  departure: Departure;
  repository: TourPackageRepository;
  onCloned: (d: Departure) => void;
};

function formatMoney(amount: number, currency: string) {
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

export function DepartureCard({ departure, repository, onCloned }: Props) {
  const t = useTranslations("packages");

  return (
    <Card className="rounded-[24px] border-zinc-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-zinc-950">{departure.code}</p>
            <CapacityBadge
              sold={departure.capacitySold}
              total={departure.capacityTotal}
              remainingLabel={t("capacityLeft")}
            />
          </div>
          <p className="text-sm font-medium text-zinc-500">
            {departure.departDate} → {departure.returnDate}
          </p>
          <p className="text-sm font-semibold tabular-nums text-zinc-800">
            {formatMoney(departure.basePrice, departure.currency)}
            <span className="ms-2 text-xs font-medium text-zinc-400">
              {t("perPerson")}
            </span>
          </p>
        </div>
        <CloneDepartureDialog
          source={departure}
          repository={repository}
          onCloned={onCloned}
        />
      </CardContent>
    </Card>
  );
}
