"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, GitBranch, ShieldCheck, type LucideIcon } from "lucide-react";
import { Sparkles, MessageCircle, BadgeCheck, FileText, Wallet } from "lucide-react";
import type { Lead, LeadStage } from "@/entities/lead";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { LEAD_STAGE_TONES, PagedList, StageBadge, TONES, WidgetCard } from "@/shared/ui";
import { MetricTile } from "@/widgets/manager-dashboard";
import { countByStage, OPEN_STAGES, openLeads, type OpenStage } from "../model/home-metrics";

type Props = {
  leads: Lead[];
};

const STAGE_LOOK: Record<OpenStage, { icon: LucideIcon; tone: "sky" | "indigo" | "violet" | "amber" | "teal" }> = {
  new: { icon: Sparkles, tone: "sky" },
  contacted: { icon: MessageCircle, tone: "indigo" },
  qualified: { icon: BadgeCheck, tone: "violet" },
  proposal: { icon: FileText, tone: "amber" },
  paid: { icon: Wallet, tone: "teal" },
};

function leadHref(lead: Lead): string {
  return lead.customerId ? routes.customer(lead.customerId) : routes.pipeline;
}

/** Open pipeline in the same widget language as the GM attention card. */
export function PipelineWidget({ leads }: Props) {
  const t = useTranslations("workspace");
  const tp = useTranslations("pipeline");
  const [stage, setStage] = useState<LeadStage | null>(null);
  const open = useMemo(() => openLeads(leads), [leads]);
  const counts = useMemo(() => countByStage(open), [open]);
  const visible = useMemo(() => (stage ? open.filter((l) => l.stage === stage) : open), [open, stage]);

  return (
    <WidgetCard
      title={t("pipelineTitle")}
      icon={GitBranch}
      tone="violet"
      count={open.length}
      href={routes.pipeline}
      hrefLabel={t("openPipeline")}
      data-testid="my-pipeline"
    >
      <div className="grid grid-cols-5 gap-2" role="group" aria-label={t("pipelineFilter")}>
        {OPEN_STAGES.map((s) => {
          const look = STAGE_LOOK[s];
          const active = stage === s;
          return (
            <MetricTile
              key={s}
              icon={look.icon}
              tone={look.tone}
              value={counts[s]}
              label={tp(`stages.${s}`)}
              active={active}
              disabled={counts[s] === 0}
              onClick={() => setStage(active ? null : s)}
              data-testid={`home-lead-tile-${s}`}
            />
          );
        })}
      </div>

      <PagedList
        className="mt-4"
        items={visible}
        resetKey={stage ?? "all"}
        rowHeight={64}
        gap={4}
        getKey={(lead) => lead.id}
        empty={<PipelineEmpty filtered={stage !== null} />}
        renderItem={(lead) => <LeadRow lead={lead} />}
      />
    </WidgetCard>
  );
}

function LeadRow({ lead }: { lead: Lead }) {
  const tp = useTranslations("pipeline");
  const tone = LEAD_STAGE_TONES[lead.stage] ?? "zinc";
  const look = STAGE_LOOK[lead.stage as OpenStage] ?? STAGE_LOOK.new;
  const Icon = look.icon;
  const subtitle = [lead.phone, lead.interest.destination || lead.interest.origin].filter(Boolean).join(" · ");

  return (
    <Link
      href={leadHref(lead)}
      data-testid={`home-lead-${lead.id}`}
      className="group flex h-full items-center gap-3.5 rounded-[20px] px-2.5 transition-colors hover:bg-zinc-50/90 focus-visible:bg-zinc-50 focus-visible:outline-none"
    >
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", TONES[look.tone].gradient, "shadow-[0_6px_12px_-6px_rgba(15,23,42,0.28)]")}>
        <Icon className="h-5 w-5" strokeWidth={2.1} />
      </span>
      <div className="min-w-0 flex-1">
        <p dir="auto" className="truncate text-[14px] font-semibold tracking-tight text-zinc-900">
          {lead.fullName}
        </p>
        <p className="truncate text-[12px] font-medium text-zinc-500">{subtitle || "—"}</p>
      </div>
      <StageBadge tone={tone} label={tp(`stages.${lead.stage}`)} />
      <ChevronRight
        className="h-4 w-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
        strokeWidth={2}
      />
    </Link>
  );
}

function PipelineEmpty({ filtered }: { filtered: boolean }) {
  const t = useTranslations("workspace");
  return (
    <div className="flex flex-col items-center gap-3 text-center" data-testid="home-pipeline-empty">
      <span className={cn("flex h-14 w-14 items-center justify-center rounded-[20px]", TONES.emerald.gradient)}>
        <ShieldCheck className="h-7 w-7" strokeWidth={2} />
      </span>
      <div className="space-y-0.5">
        <p className="text-[15px] font-semibold text-zinc-900">{t(filtered ? "pipelineEmptyFiltered" : "pipelineEmpty")}</p>
        <p className="text-[13px] text-zinc-500">{t("pipelineEmptyHint")}</p>
      </div>
    </div>
  );
}
