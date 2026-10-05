"use client";

import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, BriefcaseBusiness, CalendarClock, ListChecks, ListPlus, Lock, UserRoundSearch, Users, type LucideIcon } from "lucide-react";
import type { Booking } from "@/entities/booking";
import { stageLook, type Lead } from "@/entities/lead";
import { TASK_STATUS_LOOK, isTaskOverdue, type Task } from "@/entities/task";
import type { Departure, TourPackage } from "@/entities/tourpackage";
import { useCan } from "@/entities/viewer";
import { CompleteTaskButton } from "@/features/complete-task";
import { CreateTaskDialog } from "@/features/create-task";
import { LeadDetailDrawer } from "@/features/lead-detail";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { initials } from "@/shared/lib/avatar";
import { cn } from "@/shared/lib/cn";
import { formatDate, formatDay, formatMoneyWhole } from "@/shared/lib/format";
import { hrefForRelated } from "@/shared/lib/related-href";
import { Button, IconTile, StatTile, TONES, type Tone } from "@/shared/ui";
import { isActiveBooking, isOpenLead, isOpenTask, orderLinked } from "../model/links";
import type { PackageLinks } from "../model/use-package-links";

type Props = {
  pkg: TourPackage;
  departures: Departure[];
  links: PackageLinks;
};

/** Everything in the CRM that points at this package: interested leads, tasks and bookings. */
export function PackageLinksTab({ pkg, departures, links }: Props) {
  const t = useTranslations("packages.links");
  const tb = useTranslations("bookings");
  const locale = useLocale();
  const canCreateTask = useCan("tasks.write");
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  const { summary, can } = links;
  const depCode = new Map(departures.map((d) => [d.id, d]));

  function upsertTask(task: Task) {
    links.setTasks((prev) => {
      const rest = (prev ?? []).filter((x) => x.id !== task.id);
      return task.pkg?.packageId === pkg.id ? [task, ...rest] : rest;
    });
  }

  function upsertLead(lead: Lead) {
    links.setLeads((prev) => {
      const rest = (prev ?? []).filter((x) => x.id !== lead.id);
      return lead.interest.packageId === pkg.id ? [lead, ...rest] : rest;
    });
    setOpenLead(lead.interest.packageId === pkg.id ? lead : null);
  }

  return (
    <div className="space-y-4" data-testid="package-links">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={UserRoundSearch} tone="indigo" label={t("stats.openLeads")} value={summary.openLeads} data-testid="package-links-stat-leads" />
        <StatTile icon={ListChecks} tone="sky" label={t("stats.openTasks")} value={summary.openTasks} data-testid="package-links-stat-tasks" />
        <StatTile icon={CalendarClock} tone={summary.overdueTasks ? "rose" : "zinc"} label={t("stats.overdue")} value={summary.overdueTasks} data-testid="package-links-stat-overdue" />
        <StatTile
          icon={BriefcaseBusiness}
          tone="emerald"
          label={t("stats.bookings")}
          value={summary.activeBookings}
          caption={t("stats.pax", { n: summary.bookedPax })}
          data-testid="package-links-stat-bookings"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          icon={ListChecks}
          tone="sky"
          title={t("tasks.title")}
          count={links.tasks.length}
          testId="package-links-tasks"
          action={
            canCreateTask ? (
              <CreateTaskDialog
                repository={links.repositories.tasks}
                onCreated={upsertTask}
                context={{ packageId: pkg.id }}
                trigger={
                  <Button type="button" size="sm" data-testid="package-links-new-task">
                    <ListPlus className="h-4 w-4" aria-hidden />
                    {t("tasks.new")}
                  </Button>
                }
              />
            ) : null
          }
        >
          {!can.tasks ? (
            <Locked />
          ) : links.loading.tasks && links.tasks.length === 0 ? (
            <Skeleton />
          ) : links.tasks.length === 0 ? (
            <Empty text={t("tasks.empty")} />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {orderLinked(links.tasks, isOpenTask).map((task) => (
                <TaskRow key={task.id} task={task} locale={locale} onChanged={upsertTask} links={links} />
              ))}
            </ul>
          )}
        </Panel>

        <Panel icon={UserRoundSearch} tone="indigo" title={t("leads.title")} count={links.leads.length} testId="package-links-leads">
          {!can.leads ? (
            <Locked />
          ) : links.loading.leads && links.leads.length === 0 ? (
            <Skeleton />
          ) : links.leads.length === 0 ? (
            <Empty text={t("leads.empty")} />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {orderLinked(links.leads, isOpenLead).map((lead) => (
                <LeadRow key={lead.id} lead={lead} locale={locale} onOpen={() => setOpenLead(lead)} />
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel icon={BriefcaseBusiness} tone="emerald" title={t("bookings.title")} count={links.bookings.length} testId="package-links-bookings">
        {!can.bookings ? (
          <Locked />
        ) : links.loading.bookings && links.bookings.length === 0 ? (
          <Skeleton />
        ) : links.bookings.length === 0 ? (
          <Empty text={t("bookings.empty")} />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {orderLinked(links.bookings, isActiveBooking).map((b) => (
              <BookingRow key={b.id} booking={b} departure={depCode.get(b.departureId)} locale={locale} statusLabel={tb(`status.${b.status}`)} />
            ))}
          </ul>
        )}
      </Panel>

      <LeadDetailDrawer
        lead={openLead}
        open={Boolean(openLead)}
        onOpenChange={(open) => !open && setOpenLead(null)}
        repository={links.repositories.leads}
        onChanged={upsertLead}
      />
    </div>
  );
}

function Panel({
  icon,
  tone,
  title,
  count,
  action,
  testId,
  children,
}: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  count: number;
  action?: ReactNode;
  testId: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[26px] border border-zinc-200/60 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]" data-testid={testId}>
      <div className="mb-3 flex items-center gap-2.5">
        <IconTile icon={icon} tone={tone} />
        <h3 className="flex-1 text-[15px] font-semibold tracking-tight text-zinc-950">
          {title}
          <span className="ms-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-600">{count}</span>
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function TaskRow({ task, locale, onChanged, links }: { task: Task; locale: string; onChanged: (t: Task) => void; links: PackageLinks }) {
  const tt = useTranslations("tasks");
  const look = TASK_STATUS_LOOK[task.status];
  const overdue = isTaskOverdue(task);
  const open = isOpenTask(task);
  return (
    <li className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0" data-testid={`package-link-task-${task.id}`}>
      <IconTile icon={look.icon} tone={look.tone} size="lg" />
      <div className="min-w-0 flex-1">
        <p dir="auto" className={cn("truncate text-start text-[13.5px] font-semibold", open ? "text-zinc-900" : "text-zinc-400 line-through")}>
          {task.title}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 text-[11.5px] text-zinc-500">
          <span>{tt(`statuses.${task.status}`)}</span>
          {task.dueAt ? (
            <span className={cn(overdue && "font-semibold text-rose-600")}>
              · {formatDate(task.dueAt, locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : null}
          {task.assigneeName ? <span>· {task.assigneeName}</span> : null}
          {task.pkg?.departureCode ? (
            <span dir="ltr" className="font-mono">
              · {task.pkg.departureCode}
            </span>
          ) : null}
          {task.relatedType && task.relatedId ? (
            <Link href={hrefForRelated(task)} className="font-medium text-sky-700 hover:underline">
              · {tt.has(`related.${task.relatedType}`) ? tt(`related.${task.relatedType}` as "related.lead") : task.relatedType}
            </Link>
          ) : null}
        </p>
      </div>
      {open ? <CompleteTaskButton task={task} repository={links.repositories.tasks} onChanged={onChanged} iconOnly /> : null}
    </li>
  );
}

function LeadRow({ lead, locale, onOpen }: { lead: Lead; locale: string; onOpen: () => void }) {
  const tp = useTranslations("pipeline");
  const look = stageLook(lead.stage);
  const { interest } = lead;
  const facts = [
    interest.paxCount ? tp("card.travellers") + ": " + interest.paxCount : "",
    interest.travelDate ? formatDay(interest.travelDate, locale) : interest.travelWindow,
    interest.budgetAmount != null && interest.budgetCurrency ? formatMoneyWhole(interest.budgetAmount, locale, interest.budgetCurrency) : "",
    lead.ownerName,
  ].filter(Boolean);
  return (
    <li className="py-2.5 first:pt-0 last:pb-0">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-2xl text-start transition-colors hover:bg-zinc-50/80"
        data-testid={`package-link-lead-${lead.id}`}
      >
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold", TONES[look.tone].soft)} aria-hidden>
          {initials(lead.fullName)}
        </span>
        <span className="min-w-0 flex-1">
          <span dir="auto" className="block truncate text-start text-[13.5px] font-semibold text-zinc-900">
            {lead.fullName}
          </span>
          <span className="block truncate text-[11.5px] text-zinc-500">{facts.join(" · ") || lead.phone}</span>
        </span>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", TONES[look.tone].soft)}>{tp(`stages.${lead.stage}`)}</span>
      </button>
    </li>
  );
}

function BookingRow({ booking, departure, locale, statusLabel }: { booking: Booking; departure?: Departure; locale: string; statusLabel: string }) {
  const t = useTranslations("packages.links");
  const active = isActiveBooking(booking);
  return (
    <li>
      <Link
        href={routes.booking(booking.id)}
        className={cn(
          "flex items-center gap-3 rounded-2xl bg-zinc-50/70 px-3 py-2.5 ring-1 ring-zinc-200/60 transition hover:bg-white hover:shadow-[0_12px_28px_-22px_rgba(15,23,42,0.5)]",
          !active && "opacity-60",
        )}
        data-testid={`package-link-booking-${booking.id}`}
      >
        <IconTile icon={Users} tone={active ? "emerald" : "zinc"} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-[13px] font-semibold text-zinc-900">
            <span dir="ltr" className="font-mono text-[12px]">
              {departure?.code ?? booking.id.slice(0, 8)}
            </span>
            <span className="truncate text-zinc-500">· {statusLabel}</span>
          </span>
          <span className="block text-[11.5px] text-zinc-500">
            {departure ? formatDay(departure.departDate, locale) + " · " : ""}
            {t("stats.pax", { n: booking.paxCount })} · {formatMoneyWhole(booking.totalAmount, locale, booking.currency || "USD")}
          </span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-zinc-300 rtl:rotate-180" aria-hidden />
      </Link>
    </li>
  );
}

function Locked() {
  const t = useTranslations("packages.links");
  return (
    <p className="flex items-center gap-2 rounded-2xl bg-zinc-50 px-3 py-4 text-[12.5px] text-zinc-500">
      <Lock className="h-4 w-4" aria-hidden /> {t("locked")}
    </p>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-zinc-200 px-4 py-6 text-center text-[13px] font-medium text-zinc-400">{text}</p>;
}

function Skeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-12 animate-pulse rounded-2xl bg-zinc-100/80" />
      ))}
    </div>
  );
}
