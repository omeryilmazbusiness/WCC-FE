"use client";

import { useTranslations } from "next-intl";
import {
  BellOff,
  CalendarDays,
  CircleCheckBig,
  Package,
  PencilLine,
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
import { TONES, type Tone } from "@/shared/ui";

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

const ACTION =
  "inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10";

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
  const linkedPackage = interest.packageId ? interest.packageCode || interest.packageName || "" : "";
  const hasTrip = Boolean(travel || interest.paxCount || budget || linkedPackage || interest.packageInterest);
  const hasFlags = lead.noFollowUp || Boolean(lead.convertedBookingId);
  const sourceKind = leadSourceKind(lead.source);
  const source = LEAD_SOURCE_LOOK[sourceKind];
  const SourceIcon = source.icon;
  const sourceLabel = sourceKind === "other" ? lead.source : t(`card.sources.${sourceKind}`);
  const owner = lead.ownerName || "—";

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
        "group relative rounded-[20px] bg-white p-3.5 shadow-[0_0_0_1px_rgba(15,23,42,0.05),0_1px_2px_rgba(15,23,42,0.03)] transition-[box-shadow,transform] duration-200",
        canWrite && "cursor-grab active:cursor-grabbing",
        "hover:-translate-y-px hover:shadow-[0_0_0_1px_rgba(15,23,42,0.07),0_14px_30px_-18px_rgba(15,23,42,0.35)]",
        lead.noFollowUp && "shadow-[0_0_0_1px_rgba(245,158,11,0.28),0_1px_2px_rgba(15,23,42,0.03)]",
        dragging && "rotate-1 opacity-50",
      )}
    >
      <button
        type="button"
        className="block w-full rounded-2xl text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10"
        onClick={() => onOpen(lead)}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12.5px] font-semibold tracking-wide",
              TONES[look.tone].soft,
            )}
            aria-hidden
          >
            {initials(lead.fullName)}
          </span>
          <div className="min-w-0 flex-1">
            <p dir="auto" title={lead.fullName} className="truncate text-[14px] font-semibold tracking-tight text-zinc-900">
              {lead.fullName}
            </p>
            <p dir="ltr" className="truncate text-start text-[12px] tabular-nums text-zinc-400 rtl:text-end">
              {lead.phone}
            </p>
          </div>
          <LeadPriorityBadge leadId={lead.id} compact />
        </div>

        {hasTrip || hasFlags ? (
          <div className="mt-3 flex flex-wrap gap-1.5" data-testid="lead-card-trip">
            {travel ? <Chip icon={CalendarDays} tone="sky" label={t("card.travel")} value={travel} /> : null}
            {interest.paxCount ? (
              <Chip icon={UsersRound} tone="violet" label={t("card.travellers")} value={String(interest.paxCount)} />
            ) : null}
            {budget ? <Chip icon={Wallet} tone="emerald" label={t("card.budget")} value={budget} /> : null}
            {linkedPackage ? (
              <Chip icon={Package} tone="amber" label={t("card.package")} value={linkedPackage} filled testId="lead-card-package" />
            ) : null}
            {interest.packageInterest ? (
              <Chip icon={Package} tone="amber" label={t("card.package")} value={interest.packageInterest} className="max-w-full" />
            ) : null}
            {lead.noFollowUp ? (
              <Chip icon={BellOff} tone="amber" label={t("noFollowUpYes")} value={t("noFollowUpYes")} filled />
            ) : null}
            {lead.convertedBookingId ? (
              <Chip icon={CircleCheckBig} tone="emerald" label={t("card.converted")} value={t("card.converted")} filled />
            ) : null}
          </div>
        ) : null}

        {lead.stage === "lost" && lead.lostReason ? (
          <p dir="auto" className="mt-2.5 line-clamp-2 text-[12px] leading-5 text-zinc-500">
            {lead.lostReason}
          </p>
        ) : null}
      </button>

      <div className="mt-3 flex h-7 items-center gap-1.5" data-testid="lead-card-meta">
        {sourceLabel ? (
          <span
            role="img"
            aria-label={`${t("card.source")}: ${sourceLabel}`}
            title={`${t("card.source")}: ${sourceLabel}`}
            className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full", TONES[source.tone].soft)}
          >
            <SourceIcon className="h-3 w-3" strokeWidth={2.2} aria-hidden />
          </span>
        ) : null}
        <span
          role="img"
          aria-label={`${t("card.owner")}: ${owner}`}
          title={`${t("card.owner")}: ${owner}`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[9.5px] font-semibold text-zinc-600"
        >
          {initials(lead.ownerName || "?")}
        </span>

        <div className="relative ms-auto flex h-7 items-center">
          <time
            dateTime={lead.updatedAt}
            title={t("card.updated")}
            className={cn(
              "text-[11.5px] text-zinc-400 transition-opacity duration-150",
              canWrite && "[@media(hover:hover)]:group-focus-within:opacity-0 [@media(hover:hover)]:group-hover:opacity-0",
            )}
          >
            {formatRelativeTime(lead.updatedAt, locale)}
          </time>
          {canWrite ? (
            <div
              className={cn(
                "absolute inset-y-0 end-0 flex items-center gap-0.5 rounded-full bg-white transition-opacity duration-150",
                "[@media(hover:hover)]:pointer-events-none [@media(hover:hover)]:opacity-0",
                "[@media(hover:hover)]:group-focus-within:pointer-events-auto [@media(hover:hover)]:group-focus-within:opacity-100",
                "[@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:opacity-100",
              )}
            >
              <LeadStageMenu lead={lead} repository={repository} onChanged={onChanged} trigger="icon" triggerClassName={ACTION} />
              <AssignLeadDialog
                lead={lead}
                repository={repository}
                onAssigned={onChanged}
                trigger={
                  <button type="button" aria-label={t("assign")} title={t("assign")} data-testid="lead-card-assign" className={ACTION}>
                    <UserRoundPlus className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </button>
                }
              />
              <button
                type="button"
                aria-label={t("edit")}
                title={t("edit")}
                data-testid="lead-card-edit"
                onClick={() => onEdit(lead)}
                className={cn(ACTION, "bg-zinc-900 text-white hover:bg-zinc-700 hover:text-white")}
              >
                <PencilLine className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function Chip({
  icon: Icon,
  tone,
  label,
  value,
  filled,
  className,
  testId,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  filled?: boolean;
  className?: string;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      title={label === value ? label : `${label}: ${value}`}
      className={cn(
        "inline-flex h-7 min-w-0 items-center gap-1.5 rounded-full ps-1 pe-2.5 text-[12px] font-medium",
        filled ? TONES[tone].soft : "bg-zinc-50 text-zinc-700",
        className,
      )}
    >
      <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full", filled ? "bg-white/70" : TONES[tone].soft)}>
        <Icon className="h-3 w-3" strokeWidth={2.2} aria-hidden />
      </span>
      {label === value ? null : <span className="sr-only">{label}: </span>}
      <span dir="auto" className="truncate">
        {value}
      </span>
    </span>
  );
}
