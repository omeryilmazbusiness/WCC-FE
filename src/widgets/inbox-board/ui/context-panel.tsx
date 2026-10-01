"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Ban,
  CalendarPlus,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  FileText,
  FileWarning,
  ListTodo,
  PhoneCall,
  UserCheck,
  UserPlus,
  UserRound,
  UserRoundPen,
  UsersRound,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import {
  NEXT_TASK_OUTCOMES,
  type Conversation,
  type ConversationRepository,
  type ConversationStatus,
  type NextTaskOutcome,
} from "@/entities/conversation";
import { AILeadButton, useLeadFromConversation } from "@/features/lead-from-conversation";
import { routes } from "@/shared/config/routes";
import { initials } from "@/shared/lib/avatar";
import { cn } from "@/shared/lib/cn";
import {
  Button,
  ControlTile,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  type Tone,
} from "@/shared/ui";
import type { ConversationActions } from "../model/use-conversation-actions";
import type { Assignee } from "../model/use-assignees";
import { ContactAvatar, contactName } from "./contact-avatar";

export type PanelPermissions = {
  write: boolean;
  createTask: boolean;
  createBooking: boolean;
};

type Props = {
  conversation: Conversation;
  repository: ConversationRepository;
  actions: ConversationActions;
  assignees: Assignee[];
  currentUserId: string;
  can: PanelPermissions;
  onLinked: () => void;
};

const STATUS_TILES: { status: Exclude<ConversationStatus, "open">; icon: LucideIcon; tone: Tone }[] = [
  { status: "resolved", icon: CheckCircle2, tone: "emerald" },
  { status: "spam", icon: Ban, tone: "rose" },
  { status: "duplicate", icon: Copy, tone: "amber" },
];

const OUTCOME_LOOK: Record<NextTaskOutcome, { icon: LucideIcon; tone: Tone }> = {
  follow_up: { icon: PhoneCall, tone: "sky" },
  send_quote: { icon: FileText, tone: "violet" },
  docs_pending: { icon: FileWarning, tone: "amber" },
  payment_due: { icon: CreditCard, tone: "emerald" },
};

/** Right rail: who the contact is, who owns the thread, and what to do next. */
export function ContextPanel({ conversation: c, repository, actions, assignees, currentUserId, can, onLinked }: Props) {
  const t = useTranslations("inbox");
  const tNext = useTranslations("nextTask");
  const lead = useLeadFromConversation(c, repository, onLinked);
  const name = contactName(c, t("unknown"));
  const busy = actions.pending !== null;

  return (
    <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto pb-1 [scrollbar-width:thin]" data-testid="inbox-context">
      <Group>
        <div className="flex flex-col items-center px-2 pb-1 pt-2 text-center">
          <ContactAvatar conversation={c} label={name} size="lg" />
          <p dir="auto" className="mt-3 max-w-full truncate text-[15px] font-semibold tracking-tight text-zinc-950">
            {name}
          </p>
          {c.contactPhone ? (
            <p dir="ltr" className="mt-0.5 text-[12px] font-medium tabular-nums text-zinc-500">
              {c.contactPhone}
            </p>
          ) : null}
        </div>
        {c.customerId || c.leadId ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {c.customerId ? (
              <ControlTile href={routes.customer(c.customerId)} icon={UserRound} tone="indigo" label={t("tile.customer")} data-testid="inbox-open-customer" />
            ) : null}
            {c.leadId ? (
              <ControlTile href={routes.pipeline} icon={Workflow} tone="violet" label={t("tile.pipeline")} data-testid="inbox-open-pipeline" />
            ) : null}
          </div>
        ) : null}
      </Group>

      {can.write ? (
        <Group title={t("owner")}>
          <OwnerRow conversation={c} currentUserId={currentUserId} />
          <div className={cn("mt-3 grid gap-2", assignees.length ? "grid-cols-2" : "grid-cols-1")}>
            <ControlTile
              icon={UserCheck}
              tone="sky"
              label={t("assignToMe")}
              disabled={busy || c.ownerId === currentUserId}
              loading={actions.pending === "assign"}
              onClick={() => void actions.assign(currentUserId)}
              data-testid="inbox-assign-me"
            />
            {assignees.length ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <ControlTile icon={UsersRound} tone="violet" label={t("handOver")} disabled={busy} data-testid="inbox-assign-pick" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-80 w-64 overflow-y-auto rounded-2xl p-1.5">
                  <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    {t("pickAssignee")}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {assignees.map((a) => (
                    <DropdownMenuItem
                      key={a.id}
                      onSelect={() => void actions.assign(a.id)}
                      className="gap-2.5 rounded-xl py-2"
                      data-testid="inbox-assignee"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-600">
                        {initials(a.name)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{a.id === currentUserId ? t("you") : a.name}</span>
                      {a.id === c.ownerId ? <Check className="h-4 w-4 text-sky-600" aria-hidden /> : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </Group>
      ) : null}

      {can.write ? (
        <Group title={t("statusTitle")}>
          <div className="grid grid-cols-3 gap-2">
            {STATUS_TILES.map(({ status, icon, tone }) => (
              <ControlTile
                key={status}
                icon={icon}
                tone={tone}
                label={t(`statusShort.${status}`)}
                disabled={busy}
                loading={actions.pending === status}
                onClick={() => void actions.setStatus(status)}
                data-testid={`inbox-status-${status}`}
              />
            ))}
          </div>
        </Group>
      ) : null}

      {can.write ? (
        <Group title={tNext("title")}>
          <div className="grid grid-cols-2 gap-2">
            {NEXT_TASK_OUTCOMES.map((outcome) => (
              <ControlTile
                key={outcome}
                icon={OUTCOME_LOOK[outcome].icon}
                tone={OUTCOME_LOOK[outcome].tone}
                label={tNext(`outcomes.${outcome}`)}
                layout="row"
                active={actions.outcome === outcome}
                disabled={busy}
                onClick={() => void actions.suggest(outcome)}
                data-testid={`inbox-outcome-${outcome}`}
              />
            ))}
          </div>
          {actions.suggestion ? (
            <div className="mt-3 rounded-[18px] bg-zinc-50 p-3 ring-1 ring-inset ring-zinc-900/[0.04]" data-testid="inbox-suggestion">
              <p dir="auto" className="text-[13px] font-semibold text-zinc-900">
                {actions.suggestion.title}
              </p>
              {actions.suggestion.description ? (
                <p dir="auto" className="mt-1 text-[12px] leading-5 text-zinc-500">
                  {actions.suggestion.description}
                </p>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="mt-3 h-10 w-full rounded-[14px]"
                disabled={busy}
                onClick={() => void actions.confirm()}
              >
                <Check className="h-4 w-4" aria-hidden />
                {tNext("confirm")}
              </Button>
            </div>
          ) : null}
        </Group>
      ) : null}

      {lead.enabled || can.createTask || can.createBooking ? (
        <Group title={t("createFrom")}>
          <AILeadButton flow={lead} />
          <div className={cn("grid grid-cols-3 gap-2", lead.enabled && lead.canAI && "mt-2")}>
            {lead.enabled ? (
              <ControlTile
                icon={lead.hasLead ? UserRoundPen : UserPlus}
                tone="sky"
                label={lead.hasLead ? t("tile.editLead") : t("tile.lead")}
                onClick={() => void lead.openManually()}
                data-testid="inbox-create-lead"
              />
            ) : null}
            {can.createTask ? (
              <ControlTile
                icon={ListTodo}
                tone="amber"
                label={t("tile.task")}
                disabled={busy}
                loading={actions.pending === "task"}
                onClick={() => void actions.createTask()}
                data-testid="inbox-create-task"
              />
            ) : null}
            {can.createBooking ? (
              <ControlTile href={routes.bookings} icon={CalendarPlus} tone="emerald" label={t("tile.booking")} data-testid="inbox-open-bookings" />
            ) : null}
          </div>
          {lead.dialog}
        </Group>
      ) : null}
    </aside>
  );
}

function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-[24px] bg-white p-3 shadow-[0_0_0_1px_rgba(15,23,42,0.05),0_1px_2px_rgba(15,23,42,0.03)]">
      {title ? <h3 className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">{title}</h3> : null}
      {children}
    </section>
  );
}

function OwnerRow({ conversation: c, currentUserId }: { conversation: Conversation; currentUserId: string }) {
  const t = useTranslations("inbox");
  const mine = c.ownerId === currentUserId;
  return (
    <div className="flex items-center gap-3 rounded-[18px] bg-zinc-50/80 px-2.5 py-2" data-testid="inbox-owner">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
          c.ownerId ? "bg-sky-100 text-sky-700" : "bg-zinc-200/70 text-zinc-500",
        )}
        aria-hidden
      >
        {c.ownerId ? initials(c.ownerName) : <UserRound className="h-4 w-4" strokeWidth={2} />}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-zinc-900">{c.ownerId ? (mine ? t("you") : c.ownerName) : t("unassigned")}</p>
        <p className="truncate text-[11px] font-medium text-zinc-400">{c.ownerId ? t("ownerHint") : t("unassignedHint")}</p>
      </div>
    </div>
  );
}
