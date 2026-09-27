"use client";

import { useEffect, useState } from "react";

/** Whole seconds remaining until `deadline` (epoch ms); 0 once elapsed or unset. */
export function useCountdown(deadline: number | null): number {
  const compute = () =>
    deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : 0;
  const [remaining, setRemaining] = useState(compute);

  useEffect(() => {
    const tick = () =>
      setRemaining(deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : 0);
    tick();
    if (!deadline) return;
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [deadline]);

  return remaining;
}

export function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
