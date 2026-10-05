"use client";

import { useMemo } from "react";
import { useLiveFxBoard } from "@/entities/fx-live";
import { convertViaUsd } from "@/entities/tourpackage";

export const FX_TARGETS = ["SAR", "USD", "EUR", "TRY"] as const;

/** Live USD crosses plus a converter between package currencies (null when a rate is missing). */
export function usePackageFx() {
  const { board, loading } = useLiveFxBoard();
  return useMemo(() => {
    const crosses: Record<string, string | null> = {};
    for (const q of board?.quotes ?? []) crosses[q.currency] = q.usdCross;
    if (!crosses.SAR) crosses.SAR = "3.75";
    const ready = Boolean(board && board.quotes.some((q) => q.usdCross));
    return {
      ready,
      loading,
      stale: Boolean(board?.stale),
      convert: (minor: number, from: string, to: string) => convertViaUsd(minor, from, to, crosses),
    };
  }, [board, loading]);
}
