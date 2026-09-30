"use client";

import type { ComponentType, ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { useCan } from "@/entities/viewer";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { formatRelativeTime } from "@/shared/lib/format";

type Accent = "violet" | "rose";

const ACCENTS: Record<Accent, { header: string; glow: string; action: string }> = {
  violet: {
    header: "from-violet-600 via-fuchsia-600 to-indigo-600",
    glow: "bg-fuchsia-300/40",
    action: "text-violet-700",
  },
  rose: {
    header: "from-rose-500 via-orange-500 to-amber-400",
    glow: "bg-amber-200/50",
    action: "text-rose-700",
  },
};

type Props = {
  title: string;
  subtitle?: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  accent: Accent;
  /** Model that produced the content; shown in the AI pill. */
  model?: string;
  updatedAt?: string;
  /** Header action, e.g. regenerate. Rendered on the gradient. */
  action?: ReactNode;
  children: ReactNode;
  "data-testid"?: string;
};

/** Card frame for AI output: gradient header, icon badge, model and freshness. */
export function AIInsightCard({
  title,
  subtitle,
  icon: Icon,
  accent,
  model,
  updatedAt,
  action,
  children,
  "data-testid": testId,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("ai");
  const a = ACCENTS[accent];
  return (
    <section
      className="flex h-full flex-col overflow-hidden rounded-[28px] border border-zinc-200/60 bg-white shadow-[0_18px_44px_-28px_rgba(76,29,149,0.45)]"
      data-testid={testId}
    >
      <header className={cn("relative overflow-hidden bg-gradient-to-br px-5 pb-5 pt-5 text-white sm:px-6", a.header)}>
        <span aria-hidden className={cn("pointer-events-none absolute -end-10 -top-12 h-36 w-36 rounded-full blur-2xl", a.glow)} />
        <span aria-hidden className="pointer-events-none absolute -bottom-16 start-1/3 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/35 backdrop-blur">
            <Icon className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[17px] font-semibold tracking-tight">{title}</h2>
            {subtitle ? <p className="mt-0.5 truncate text-xs font-medium text-white/80">{subtitle}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        <div className="relative mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 ring-1 ring-white/30">
            <Sparkles className="h-3 w-3" aria-hidden />
            {model ? `AI · ${model}` : "AI"}
          </span>
          {updatedAt ? (
            <span className="rounded-full bg-black/10 px-2.5 py-1 text-white/85">
              {t("updated", { when: formatRelativeTime(updatedAt, locale) })}
            </span>
          ) : null}
        </div>
      </header>
      <div className="flex-1 p-5 sm:p-6">{children}</div>
    </section>
  );
}

/** Glass button for the gradient header. */
export function AIHeaderButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-zinc-900 shadow-sm transition-all duration-300 hover:bg-white disabled:opacity-60"
    >
      {children}
    </button>
  );
}

/** Shown instead of any content while the branch has no AI key. */
export function AIConnectState({ text }: { text: string }) {
  const t = useTranslations("ai");
  const canSetup = useCan("ai.setup");
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-violet-200 bg-gradient-to-br from-violet-50 via-white to-sky-50 p-4">
      <p className="text-sm font-medium leading-relaxed text-zinc-700">{text}</p>
      {canSetup ? (
        <Link
          href={routes.aiSetup}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_10px_24px_-14px_rgba(124,58,237,0.9)] transition-all duration-300 hover:brightness-110"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {t("configure")}
        </Link>
      ) : (
        <p className="text-xs text-zinc-500">{t("askAdmin")}</p>
      )}
    </div>
  );
}

/** Placeholder lines while the model is thinking. */
export function AISkeleton() {
  return (
    <div className="space-y-2.5" aria-busy="true">
      <div className="h-4 w-3/4 animate-pulse rounded-full bg-zinc-100" />
      <div className="h-3 w-full animate-pulse rounded-full bg-zinc-100" />
      <div className="h-3 w-5/6 animate-pulse rounded-full bg-zinc-100" />
      <div className="h-3 w-2/3 animate-pulse rounded-full bg-zinc-100" />
    </div>
  );
}
