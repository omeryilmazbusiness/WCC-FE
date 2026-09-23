"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type {
  Departure,
  DepartureReadiness,
  TourPackageRepository,
} from "@/entities/tourpackage";
import { departureRemaining } from "@/entities/tourpackage";
import { CloneDepartureDialog } from "@/features/clone-departure";
import { Badge, Button, CapacityBadge, Card, CardContent, useToast } from "@/shared/ui";

type Props = {
  departure: Departure;
  repository: TourPackageRepository;
  onChanged: (d: Departure) => void;
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

export function DepartureCard({ departure, repository, onChanged }: Props) {
  const t = useTranslations("packages");
  const { push } = useToast();
  const [ready, setReady] = useState<DepartureReadiness | null>(null);

  useEffect(() => {
    void repository.readiness(departure.id).then(setReady).catch(() => setReady(null));
  }, [departure.id, departure.capacitySold, departure.salesClosed, repository]);

  async function closeSales(closed: boolean) {
    try {
      const updated = await repository.closeSales(departure.id, closed);
      onChanged(updated);
      push({
        title: closed ? t("salesClosedTitle") : t("salesOpenedTitle"),
        tone: "success",
      });
    } catch {
      push({ title: t("actionError"), tone: "error" });
    }
  }

  async function markFull() {
    try {
      const updated = await repository.markFull(departure.id);
      onChanged(updated);
      push({ title: t("markedFullTitle"), tone: "success" });
    } catch {
      push({ title: t("actionError"), tone: "error" });
    }
  }

  const alert = departure.alert ?? ready?.alert ?? "ok";

  return (
    <Card className="rounded-[24px] border-zinc-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-zinc-950">{departure.code}</p>
              <CapacityBadge
                sold={departure.capacitySold}
                total={departure.capacityTotal}
                remainingLabel={t("capacityLeft")}
              />
              {alert !== "ok" ? (
                <Badge className="bg-amber-100 text-amber-900">
                  {t(`alerts.${alert}`)}
                </Badge>
              ) : null}
              {departure.salesClosed ? (
                <Badge className="bg-zinc-900 text-white">{t("salesClosed")}</Badge>
              ) : null}
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
            {ready ? (
              <p className="text-xs font-medium text-zinc-500">
                {t("readinessSummary", {
                  confirmed: ready.bookings_confirmed,
                  draft: ready.bookings_draft,
                  remaining: ready.remaining ?? departureRemaining(departure),
                })}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <CloneDepartureDialog
              source={departure}
              repository={repository}
              onCloned={onChanged}
            />
            {!departure.salesClosed ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void closeSales(true)}
                >
                  {t("closeSales")}
                </Button>
                <Button type="button" size="sm" onClick={() => void markFull()}>
                  {t("markFull")}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void closeSales(false)}
              >
                {t("reopenSales")}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
