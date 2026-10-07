"use client";

import { ArrowRight, Gauge } from "lucide-react";
import { useTranslations } from "next-intl";
import { aiStatus, providerInfo, type AIRepository, type AISetup } from "@/entities/ai";
import { AIPowerButton, PROVIDER_LOOK } from "@/features/ai-setup";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { Button, TONES } from "@/shared/ui";
import { STATUS_LOOK } from "../model/welcome-look";

type Props = {
  repo: Pick<AIRepository, "completeSetup" | "disable">;
  setup: AISetup;
  onChange: (setup: AISetup) => void;
  editing: boolean;
  onEdit: () => void;
};

/** The connected provider at a glance, with pause / resume and a way to switch. */
export function ConnectionCard({ repo, setup, onChange, editing, onEdit }: Props) {
  const t = useTranslations("aiSetup");
  const info = providerInfo(setup.provider);
  const status = aiStatus(setup);
  if (!info || status === "off") return null;
  const look = PROVIDER_LOOK[info.id];
  const Icon = look.icon;

  return (
    <section className="rounded-[28px] bg-white p-5 ring-1 ring-zinc-200/60 shadow-[0_24px_60px_-40px_rgba(24,24,27,0.35)]" data-testid="ai-connection">
      <div className="flex items-start gap-4">
        <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px]", TONES[look.tone].gradient)}>
          <Icon className="h-7 w-7" strokeWidth={1.8} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-zinc-500">
            <span className={cn("h-2 w-2 rounded-full", STATUS_LOOK[status].dot)} aria-hidden />
            {t(`status.${status}.label`)}
          </p>
          <p className="text-[19px] font-bold tracking-tight text-zinc-950">{info.label}</p>
          <p className="mt-0.5 text-[13px] leading-snug text-zinc-500">{t(`status.${status}.body`)}</p>
        </div>
      </div>
      {setup.verification === "throttled" ? (
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-50 px-3 py-2.5 text-[12.5px] leading-snug text-amber-800" data-testid="ai-throttled">
          <Gauge className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {t("throttled.body", { provider: info.name })}
        </p>
      ) : null}
      <dl className="mt-4 grid grid-cols-2 gap-2">
        <Fact label={t("modelLabel")} value={setup.model || info.models[0]} />
        <Fact label={t("keyLabel")} value={setup.keyHint || "••••"} />
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <AIPowerButton repo={repo} setup={setup} onChange={onChange} />
        {!editing ? (
          <Button type="button" variant="ghost" className="h-10 rounded-full px-4 text-[#007AFF]" onClick={onEdit} data-testid="ai-edit">
            {t("edit")}
          </Button>
        ) : null}
        {status === "ready" ? (
          <Button asChild variant="ghost" className="ms-auto h-10 rounded-full px-4">
            <Link href={routes.manager}>
              {t("goDashboard")}
              <ArrowRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
            </Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-50 px-3 py-2.5">
      <dt className="text-[11.5px] font-semibold uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="truncate font-mono text-[13.5px] text-zinc-900" dir="ltr">
        {value}
      </dd>
    </div>
  );
}
