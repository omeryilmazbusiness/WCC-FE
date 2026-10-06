"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const PARAM = "departure_id";
const LEGACY_PARAM = "departureId";

/** Selected departure kept in `?departure_id=` so the view can be linked, shared and reloaded. */
export function useDepartureParam(): [string, (id: string) => void] {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const current = (search.get(PARAM) ?? search.get(LEGACY_PARAM) ?? "").trim();

  const select = useCallback(
    (id: string) => {
      const params = new URLSearchParams(search.toString());
      params.delete(LEGACY_PARAM);
      if (id.trim()) params.set(PARAM, id.trim());
      else params.delete(PARAM);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, search],
  );

  return [current, select];
}
