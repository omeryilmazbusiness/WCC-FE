"use client";

import { useCallback, useState } from "react";

/**
 * Open state a component owns unless the parent passes `open` (then the parent owns it
 * and is told about changes through `onOpenChange`).
 */
export function useControllableOpen(
  open: boolean | undefined,
  onOpenChange: ((open: boolean) => void) | undefined,
): [boolean, (open: boolean) => void, boolean] {
  const [inner, setInner] = useState(false);
  const controlled = open !== undefined;
  const set = useCallback(
    (next: boolean) => {
      if (!controlled) setInner(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );
  return [controlled ? open : inner, set, controlled];
}
