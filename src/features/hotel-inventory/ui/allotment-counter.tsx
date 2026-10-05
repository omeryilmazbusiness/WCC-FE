"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Minus, Plus } from "lucide-react";
import type { Allotment, HotelRepository } from "@/entities/hotel";
import { cn } from "@/shared/lib/cn";
import { useMutationFeedback } from "@/shared/ui";

type Props = {
  repository: HotelRepository;
  allotment: Allotment;
  disabled?: boolean;
  onChanged: (allotment: Allotment) => void;
};

const btn =
  "flex h-9 w-9 items-center justify-center rounded-xl bg-white text-zinc-700 shadow-sm ring-1 ring-zinc-200 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40";

/** Live sold counter: one tap books or frees a room in the block (server-checked). */
export function AllotmentCounter({ repository, allotment, disabled, onChanged }: Props) {
  const t = useTranslations("hotels.allotment");
  const feedback = useMutationFeedback();
  const [busy, setBusy] = useState(false);

  async function adjust(delta: number) {
    setBusy(true);
    try {
      onChanged(await repository.adjustAllotment(allotment.hotelId, allotment.id, delta));
    } catch (e) {
      feedback.error(e, t("adjustError"));
    } finally {
      setBusy(false);
    }
  }

  const canSell = !disabled && !busy && allotment.status === "open" && allotment.available > 0;
  const canFree = !disabled && !busy && allotment.sold > 0 && allotment.status !== "expired";

  return (
    <div className="flex items-center gap-1.5 rounded-2xl bg-zinc-100/80 p-1" data-testid={`allotment-counter-${allotment.id}`}>
      <button type="button" className={btn} disabled={!canFree} onClick={() => void adjust(-1)} aria-label={t("release1")}>
        <Minus className="h-4 w-4" strokeWidth={2.4} />
      </button>
      <span className={cn("min-w-[3.5rem] text-center text-[15px] font-semibold tabular-nums text-zinc-950", busy && "opacity-50")} aria-live="polite">
        {allotment.sold}
        <span className="text-[12px] font-medium text-zinc-400">/{allotment.rooms}</span>
      </span>
      <button type="button" className={btn} disabled={!canSell} onClick={() => void adjust(1)} aria-label={t("sell1")} data-testid={`allotment-sell-${allotment.id}`}>
        <Plus className="h-4 w-4" strokeWidth={2.4} />
      </button>
    </div>
  );
}
