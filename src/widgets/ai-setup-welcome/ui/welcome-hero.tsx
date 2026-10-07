"use client";

import { ArrowDown, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AIStatus } from "@/entities/ai";
import { cn } from "@/shared/lib/cn";
import { STATUS_LOOK } from "../model/welcome-look";

/** App-icon hero in the spirit of an iOS welcome screen, with the live connection state. */
export function WelcomeHero({ status, onStart }: { status: AIStatus; onStart?: () => void }) {
  const t = useTranslations("aiSetup");
  const look = STATUS_LOOK[status];

  return (
    <header className="flex flex-col items-center px-4 pb-2 pt-6 text-center sm:pt-10" data-testid="ai-welcome-hero">
      <div className="relative">
        <div
          className="absolute inset-0 -z-10 scale-125 rounded-full bg-gradient-to-br from-violet-400/40 via-fuchsia-400/30 to-orange-300/40 blur-2xl"
          aria-hidden
        />
        <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 text-white shadow-[0_24px_48px_-20px_rgba(168,85,247,0.75)] ring-1 ring-white/40 sm:h-28 sm:w-28 sm:rounded-[32px]">
          <Sparkles className="h-11 w-11 sm:h-12 sm:w-12" strokeWidth={1.6} aria-hidden />
        </div>
      </div>
      <p className="mt-6 text-[13px] font-semibold uppercase tracking-[0.14em] text-violet-600">{t("eyebrow")}</p>
      <h1 className="mt-2 max-w-2xl text-balance text-[30px] font-bold leading-[1.1] tracking-tight text-zinc-950 sm:text-[40px]">
        {t("heroTitle")}
      </h1>
      <p className="mt-3 max-w-xl text-balance text-[15.5px] leading-relaxed text-zinc-500 sm:text-[17px]">{t("heroBody")}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <span
          className={cn("inline-flex h-8 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold", look.pill)}
          data-testid="ai-status"
          data-status={status}
        >
          <span className={cn("h-2 w-2 rounded-full", look.dot)} aria-hidden />
          {t(`status.${status}.label`)}
        </span>
        {onStart ? (
          <button
            type="button"
            onClick={onStart}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-zinc-950 px-3.5 text-[13px] font-semibold text-white transition hover:bg-zinc-800 lg:hidden"
          >
            {t("getStarted")}
            <ArrowDown className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
    </header>
  );
}
