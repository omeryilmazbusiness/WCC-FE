"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Clock3 } from "lucide-react";
import { formatCountdown, useCountdown } from "@/shared/lib/use-countdown";
import type { Lockout } from "../model/lockout";
import { GlassNotice } from "./glass-controls";

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
    <GlassNotice
      role="alert"
      data-testid="login-lockout"
      tone="warning"
      icon={<Clock3 className="h-4 w-4" strokeWidth={1.75} />}
    >
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-0.5 tabular-nums text-white/65" aria-live="off">
        {body}
      </p>
    </GlassNotice>
  );
}
