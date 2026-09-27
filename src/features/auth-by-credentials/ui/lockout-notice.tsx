"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Clock3 } from "lucide-react";
import { formatCountdown, useCountdown } from "@/shared/lib/use-countdown";
import type { Lockout } from "../model/lockout";

type Props = {
  lockout: Lockout;
  onElapsed: () => void;
};

export function LockoutNotice({ lockout, onElapsed }: Props) {
  const t = useTranslations("auth");
  const remaining = useCountdown(lockout.until);
  const elapsed = lockout.until !== null && remaining === 0;

  useEffect(() => {
    if (elapsed) onElapsed();
  }, [elapsed, onElapsed]);

  const title = lockout.kind === "locked" ? t("lockedTitle") : t("rateLimitedTitle");
  const body =
    lockout.until === null
      ? t("lockedNoTimer")
      : t("retryIn", { time: formatCountdown(remaining) });

  return (
    <div
      role="alert"
      data-testid="login-lockout"
      className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4"
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
        <Clock3 className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-950">{title}</p>
        <p className="mt-0.5 text-sm font-medium tabular-nums text-zinc-600" aria-live="off">
          {body}
        </p>
      </div>
    </div>
  );
}
