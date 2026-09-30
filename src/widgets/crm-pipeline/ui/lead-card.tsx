"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  BellOff,
  CalendarDays,
  CircleCheckBig,
  Clock3,
  MapPinned,
  Package,
  PencilLine,
  Phone,
  UserRoundPlus,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  LEAD_SOURCE_LOOK,
  leadSourceKind,
  stageLook,
  type Lead,
  type LeadRepository,
} from "@/entities/lead";
import { AssignLeadDialog } from "@/features/assign-lead";
import { LeadStageMenu } from "@/features/change-lead-stage";
import { LeadPriorityBadge } from "@/features/lead-priority";
import { initials } from "@/shared/lib/avatar";
import { cn } from "@/shared/lib/cn";
import { formatDay, formatMoneyWhole, formatRelativeTime } from "@/shared/lib/format";
import { IconTile, TONES } from "@/shared/ui";

type Props = {
  lead: Lead;
  locale: string;
  repository: LeadRepository;
  canWrite: boolean;
  dragging: boolean;
  onChanged: (lead: Lead) => void;
  onOpen: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDragStart: (lead: Lead) => void;
  onDragEnd: () => void;
};

/** A lead on the board: who, what trip they want, where they came from and who owns it. */
export function LeadCard({ lead, locale, repository, canWrite, dragging, onChanged, onOpen, onEdit, onDragStart, onDragEnd }: Props) {
  const t = useTranslations("pipeline");
  const look = stageLook(lead.stage);
  const { interest } = lead;
  const travel = interest.travelDate ? formatDay(interest.travelDate, locale) : interest.travelWindow;
  const budget =
    interest.budgetAmount != null && interest.budgetCurrency
      ? formatMoneyWhole(interest.budgetAmount, locale, interest.budgetCurrency)
      : "";
  const hasTrip = Boolean(travel || interest.paxCount || budget || interest.packageInterest);
  const sourceKind = leadSourceKind(lead.source);
  const source = LEAD_SOURCE_LOOK[sourceKind];
  const sourceLabel = sourceKind === "other" ? lead.source : t(`card.sources.${sourceKind}`);

  return (
    <article
      draggable={canWrite}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/lead-id", lead.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(lead);
      }}
      onDragEnd={onDragEnd}
      data-testid="lead-card"
      data-lead={lead.id}
      className={cn(
        "group relative rounded-[22px] border border-zinc-200/60 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-22px_rgba(15,23,42,0.45)] transition-all duration-200",
        canWrite && "cursor-grab active:cursor-grabbing",
        "hover:-translate-y-0.5 hover:border-zinc-300/70 hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_20px_36px_-24px_rgba(15,23,42,0.5)]",
        lead.noFollowUp && "border-amber-200/80",
        dragging && "rotate-1 opacity-50",
      )}
    >
      <button
        type="button"
        className="block w-full rounded-2xl text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10"
        onClick={() => onOpen(lead)}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[13px] font-bold tracking-wide",
              TONES[look.tone].gradient,
            )}
            aria-hidden
          >
            {initials(lead.fullName)}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex min-w-0 items-center gap-2">
              <p dir="auto" title={lead.fullName} className="min-w-0 flex-1 truncate text-[14.5px] font-semibold tracking-tight text-zinc-950">
                {lead.fullName}
              </p>
              <LeadPriorityBadge leadId={lead.id} />
            </div>
            <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[12px] font-medium text-zinc-500">
              <Phone className="h-3 w-3 shrink-0 text-zinc-400" strokeWidth={2.2} aria-hidden />
              <span dir="ltr" className="truncate tabular-nums">
                {lead.phone}
              </span>
            </p>
            <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] font-medium text-zinc-400" title={t("card.updated")}>
              <Clock3 className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{formatRelativeTime(lead.updatedAt, locale)}</span>
            </p>
          </div>
        </div>

        {hasTrip ? (
          <div className="mt-3.5 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2.5" data-testid="lead-card-trip">
            {travel ? <Fact leading={<IconTile icon={CalendarDays} tone="sky" />} label={t("card.travel")} value={travel} /> : null}
            {interest.paxCount ? (
              <Fact leading={<IconTile icon={UsersRound} tone="violet" />} label={t("card.travellers")} value={String(interest.paxCount)} />
            ) : null}
            {budget ? <Fact leading={<IconTile icon={Wallet} tone="emerald" />} label={t("card.budget")} value={budget} className="col-span-2" /> : null}
            {interest.packageInterest ? (
              <Fact leading={<IconTile icon={Package} tone="amber" />} label={t("card.package")} value={interest.packageInterest} className="col-span-2" />
            ) : null}
          </div>
        ) : (
          <div
            className="mt-3.5 flex items-center gap-2.5 rounded-2xl border border-dashed border-zinc-200 px-2.5 py-2 text-[12px] font-medium text-zinc-400"
            data-testid="lead-card-no-trip"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-50 text-zinc-400">
              <MapPinned className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
            {t("card.noTrip")}
          </div>
        )}

        {lead.noFollowUp || lead.convertedBookingId || (lead.stage === "lost" && lead.lostReason) ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {lead.noFollowUp ? (
              <Flag icon={BellOff} className="bg-amber-50 text-amber-800 ring-amber-100">
                {t("noFollowUpYes")}
              </Flag>
            ) : null}
            {lead.convertedBookingId ? (
              <Flag icon={CircleCheckBig} className="bg-emerald-50 text-emerald-700 ring-emerald-100">
                {t("card.converted")}
              </Flag>
            ) : null}
            {lead.stage === "lost" && lead.lostReason ? (
              <p className="line-clamp-2 w-full rounded-xl bg-zinc-50 px-2.5 py-1.5 text-[11.5px] text-zinc-600">{lead.lostReason}</p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 border-t border-dashed border-zinc-200/80 pt-3" data-testid="lead-card-meta">
          {sourceLabel ? <Fact leading={<IconTile icon={source.icon} tone={source.tone} size="sm" />} label={t("card.source")} value={sourceLabel} /> : null}
          <Fact
            label={t("card.owner")}
            value={lead.ownerName || "—"}
            leading={
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-zinc-100 text-[10px] font-bold text-zinc-600">
                {initials(lead.ownerName || "?")}
              </span>
            }
          />
        </div>
      </button>

      <div className="mt-3 flex items-center gap-1">
        <LeadStageMenu lead={lead} repository={repository} onChanged={onChanged} />
        {canWrite ? (
          <div className="ms-auto flex items-center gap-1">
            <AssignLeadDialog
              lead={lead}
              repository={repository}
              onAssigned={onChanged}
              trigger={<IconAction icon={UserRoundPlus} label={t("assign")} testId="lead-card-assign" />}
            />
            <IconAction icon={PencilLine} label={t("edit")} onClick={() => onEdit(lead)} testId="lead-card-edit" emphasis />
          </div>
        ) : null}
      </div>
    </article>
  );
}

function Fact({ leading, label, value, className }: { leading: ReactNode; label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)} title={`${label}: ${value}`}>
      {leading}
      <div className="min-w-0">
        <p className="truncate text-[10.5px] font-medium leading-4 text-zinc-400">{label}</p>
        <p dir="auto" className="truncate text-start text-[12.5px] font-semibold leading-4 text-zinc-800">
          {value}
        </p>
      </div>
    </div>
  );
}

function Flag({ icon: Icon, className, children }: { icon: LucideIcon; className: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset", className)}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
      {children}
    </span>
  );
}

type IconActionProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
  testId?: string;
  emphasis?: boolean;
};

function IconAction({ icon: Icon, label, testId, emphasis, className, ...rest }: IconActionProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-testid={testId}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10",
        emphasis
          ? "bg-zinc-900 text-white shadow-[0_6px_14px_-8px_rgba(15,23,42,0.7)] hover:bg-zinc-800"
          : "bg-zinc-50 text-zinc-500 ring-1 ring-inset ring-zinc-100 hover:bg-zinc-100 hover:text-zinc-900",
        className,
      )}
      {...rest}
    >
      <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
      {emphasis ? <span>{label}</span> : null}
    </button>
  );
}
