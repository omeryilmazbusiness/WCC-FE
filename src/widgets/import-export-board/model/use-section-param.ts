"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Section } from "@/entities/importexport";

/** Active section lives in `?tab=` so a view can be bookmarked; falls back to the first allowed one. */
export function useSectionParam(allowed: readonly Section[]): [Section | null, (next: Section) => void] {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = search.get("tab") as Section | null;
  const current = raw && allowed.includes(raw) ? raw : (allowed[0] ?? null);

  const set = useCallback(
    (next: Section) => {
      const params = new URLSearchParams(search.toString());
      if (next === allowed[0]) params.delete("tab");
      else params.set("tab", next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [allowed, pathname, router, search],
  );

  return [current, set];
}
