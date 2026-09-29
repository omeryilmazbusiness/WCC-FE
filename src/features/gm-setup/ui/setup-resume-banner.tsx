"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { createSetupRepository } from "@/entities/setup";
import { useCan } from "@/entities/viewer";
import { Link } from "@/shared/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { ProgressRing } from "@/shared/ui";
import { donePercent } from "../model/flow";

/**
 * Dashboard card that stays until every setup step is done — skipped AI or
 * channels keep it visible, even after the GM finished the wizard.
 */
export function SetupResumeBanner() {
  const t = useTranslations("setup.banner");
  const tSteps = useTranslations("setup.steps");
  const allowed = useCan("setup.manage");
  const repository = useMemo(() => createSetupRepository(), []);
  const { data } = useApiQuery(() => repository.get(), [repository], { enabled: allowed });

  if (!allowed || !data || data.fullyDone) return null;
  const open = data.steps.filter((s) => s.status !== "done").map((s) => tSteps(`${s.key}.label`));

  return (
    <Link
      href={routes.setup}
      className="liquid-glass group flex items-center gap-4 rounded-[24px] px-5 py-4 transition-transform duration-200 active:scale-[0.99]"
      data-testid="setup-resume-banner"
    >
      <ProgressRing
        value={donePercent(data)}
        size={44}
        thickness={5}
        tone="sky"
        label={
          <span className="text-[11px] font-semibold tabular-nums text-zinc-900">
            {data.doneCount}/{data.totalSteps}
          </span>
        }
      />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold tracking-[-0.01em] text-zinc-950">{t("title")}</p>
        <p className="truncate text-[12px] text-zinc-500">
          {data.completed ? t("remaining", { steps: open.join(" · ") }) : t("subtitle")}
        </p>
      </div>
      <span className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-zinc-950 px-4 text-[13px] font-semibold text-white">
        {t("cta")}
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
      </span>
    </Link>
  );
}
