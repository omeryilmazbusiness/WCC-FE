"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const PARAM = "task";

/** Open task kept in `?task=` so notifications and shared links land on its detail. */
export function useTaskParam(): [string, (id: string) => void] {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const current = (search.get(PARAM) ?? "").trim();

  const select = useCallback(
    (id: string) => {
      const params = new URLSearchParams(search.toString());
      if (id.trim()) params.set(PARAM, id.trim());
      else params.delete(PARAM);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, search],
  );

  return [current, select];
}
