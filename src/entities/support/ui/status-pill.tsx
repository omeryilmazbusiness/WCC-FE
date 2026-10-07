"use client";

import { CheckCircle2, CircleDot, Clock3, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import type { SupportStatus } from "../model";

export const SUPPORT_STATUS_LOOK: Record<SupportStatus, { icon: LucideIcon; className: string }> = {
  open: { icon: CircleDot, className: "bg-sky-50 text-sky-700" },
  in_progress: { icon: Clock3, className: "bg-amber-50 text-amber-700" },
  resolved: { icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700" },
};

export function SupportStatusPill({ status, className }: { status: SupportStatus; className?: string }) {
  const t = useTranslations("support.status");
  const look = SUPPORT_STATUS_LOOK[status];
  const Icon = look.icon;
  return (
    <span
      className={cn("inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[11.5px] font-semibold", look.className, className)}
      data-testid="support-status"
      data-status={status}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {t(status)}
    </span>
  );
}
