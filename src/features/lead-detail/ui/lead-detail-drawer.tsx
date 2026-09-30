"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  BellOff,
  BellRing,
  CalendarDays,
  CalendarPlus,
  CircleCheckBig,
  CircleX,
  History,
  IdCard,
  MapPinned,
  Package,
  PencilLine,
  PhoneCall,
  Plane,
  Repeat2,
  StickyNote,
  Trash2,
  UserRound,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  hasTripInterest,
  LEAD_SOURCE_LOOK,
  leadSourceKind,
  stageLook,
  type Lead,
  type LeadRepository,
  type StageHistoryItem,
} from "@/entities/lead";
import { createTourPackageRepository } from "@/entities/tourpackage";
import { useCan } from "@/entities/viewer";
import { AssignLeadDialog } from "@/features/assign-lead";
import { LeadStageMenu } from "@/features/change-lead-stage";
import { ConvertLeadDialog } from "@/features/convert-lead";
import { LeadFormDialog } from "@/features/create-lead";
import { LeadPriorityBadge } from "@/features/lead-priority";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { initials } from "@/shared/lib/avatar";
import { cn } from "@/shared/lib/cn";
import { formatDateTime, formatDay, formatMoney, formatRelativeTime } from "@/shared/lib/format";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  IconTile,
  TONES,
  type Tone,
  useMutationFeedback,
} from "@/shared/ui";

type Props = {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repository: LeadRepository;
  onChanged: (lead: Lead) => void;
  /** Shown when the viewer may delete leads; the caller confirms and deletes. */
  onDelete?: (lead: Lead) => void;
};

export function LeadDetailDrawer({ lead, open, onOpenChange, repository, onChanged, onDelete }: Props) {
  const locale = useLocale();
  const [history, setHistory] = useState<StageHistoryItem[]>([]);
  const [packageLabel, setPackageLabel] = useState("");
  const packageId = lead?.interest.packageId ?? null;

  useEffect(() => {
    if (!packageId || !open) {
      setPackageLabel("");
      return;
    }
    let cancelled = false;
    void createTourPackageRepository()
      .listPackages(false)
      .then((rows) => {
        const p = rows.find((r) => r.id === packageId);
        if (!cancelled) setPackageLabel(p ? `${p.code} · ${locale === "ar" && p.nameAr ? p.nameAr : p.nameEn}` : "");
      })
      .catch(() => {
        if (!cancelled) setPackageLabel("");
      });
    return () => {
      cancelled = true;
    };
  }, [packageId, open, locale]);

  const leadId = lead?.id ?? null;
  const updatedAt = lead?.updatedAt;
  useEffect(() => {
    if (!leadId || !open) return;
    let cancelled = false;
    void repository
      .history(leadId)
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [leadId, updatedAt, open, repository]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-[30rem] bg-zinc-50" data-testid="lead-detail">
        {lead ? (
          <LeadDetail
            lead={lead}
            locale={locale}
            history={history}
            packageLabel={packageLabel}
            repository={repository}
            onChanged={onChanged}
            onDelete={onDelete}
          />
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

type DetailProps = {
  lead: Lead;
  locale: string;
  history: StageHistoryItem[];
  packageLabel: string;
  repository: LeadRepository;
  onChanged: (lead: Lead) => void;
  onDelete?: (lead: Lead) => void;
};

function LeadDetail({ lead, locale, history, packageLabel, repository, onChanged, onDelete }: DetailProps) {
  const t = useTranslations("pipeline");
  const feedback = useMutationFeedback();
  const canWrite = useCan("leads.write");
  const [editing, setEditing] = useState(false);
  const [togglingFollowUp, setTogglingFollowUp] = useState(false);
  const look = stageLook(lead.stage);
  const StageIcon = look.icon;
  const sourceKind = leadSourceKind(lead.source);
  const source = LEAD_SOURCE_LOOK[sourceKind];
  const sourceLabel = sourceKind === "other" ? lead.source : t(`card.sources.${sourceKind}`);
  const { interest } = lead;
  const isOpen = lead.stage !== "won" && lead.stage !== "lost";
  const trip = tripFacts({
    travel: interest.travelDate ? formatDay(interest.travelDate, locale) : interest.travelWindow,
    travelHint: interest.travelDate ? interest.travelWindow : "",
    pax: interest.paxCount ? String(interest.paxCount) : "",
    budget:
      interest.budgetAmount != null && interest.budgetCurrency
        ? formatMoney(interest.budgetAmount, locale, interest.budgetCurrency)
        : "",
    pkg: packageLabel || interest.packageInterest,
    pkgHint: packageLabel && interest.packageInterest ? interest.packageInterest : "",
    labels: {
      travel: t("fields.travelDate"),
      pax: t("fields.travellers"),
      budget: t("fields.budget"),
      pkg: t("fields.package"),
    },
  });

  async function toggleFollowUp() {
    setTogglingFollowUp(true);
    try {
      onChanged(await repository.setNoFollowUp(lead.id, !lead.noFollowUp));
    } catch (err) {
      feedback.error(err);
    } finally {
      setTogglingFollowUp(false);
    }
  }

  return (
    <>
      <DrawerHeader className={cn("border-b border-zinc-200/60 bg-gradient-to-b px-6 pb-5 pt-6", TONES[look.tone].tint)}>
        <div className="flex items-start gap-4">
          <span
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] text-[17px] font-bold tracking-wide",
              TONES[look.tone].gradient,
            )}
            aria-hidden
          >
            {initials(lead.fullName)}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <DrawerTitle dir="auto" className="truncate text-start text-[20px] tracking-tight">
              {lead.fullName}
            </DrawerTitle>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold",
                  TONES[look.tone].soft,
                )}
                data-testid="lead-detail-stage"
              >
                <StageIcon className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
                {t(`stages.${lead.stage}`)}
              </span>
              <LeadPriorityBadge leadId={lead.id} />
              {lead.noFollowUp ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11.5px] font-semibold text-amber-800">
                  <BellOff className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
                  {t("noFollowUpYes")}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <DrawerDescription className="sr-only">
          {[lead.phone, sourceLabel].filter(Boolean).join(" · ")}
        </DrawerDescription>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <a
            href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}
            className="group flex min-w-0 items-center gap-2.5 rounded-2xl bg-white/90 p-2.5 ring-1 ring-inset ring-zinc-200/70 transition hover:bg-white hover:ring-zinc-300"
            data-testid="lead-detail-call"
          >
            <IconTile icon={PhoneCall} tone="teal" />
            <span className="min-w-0">
              <span className="block text-[10.5px] font-medium text-zinc-400">{t("detail.call")}</span>
              <span dir="ltr" className="block truncate text-start text-[13px] font-semibold tabular-nums text-zinc-900">
                {lead.phone}
              </span>
            </span>
          </a>
          <div className="flex min-w-0 items-center gap-2.5 rounded-2xl bg-white/90 p-2.5 ring-1 ring-inset ring-zinc-200/70">
            <IconTile icon={source.icon} tone={source.tone} />
            <span className="min-w-0">
              <span className="block text-[10.5px] font-medium text-zinc-400">{t("fields.source")}</span>
              <span dir="auto" className="block truncate text-start text-[13px] font-semibold text-zinc-900">
                {sourceLabel || "—"}
              </span>
            </span>
          </div>
        </div>
      </DrawerHeader>

      <DrawerBody className="space-y-3.5 px-5 py-5">
        <Section
          icon={Plane}
          tone="sky"
          title={t("tripTitle")}
          testId="lead-detail-trip"
          action={
            canWrite && hasTripInterest(interest) ? (
              <SectionAction icon={PencilLine} label={t("edit")} onClick={() => setEditing(true)} />
            ) : null
          }
        >
          {hasTripInterest(interest) ? (
            <div className="grid grid-cols-2 gap-2">
              {trip.map(({ key, wide, ...fact }) => (
                <TripTile key={key} {...fact} className={wide ? "col-span-2" : undefined} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-zinc-200 px-4 py-5 text-center">
              <IconTile icon={MapPinned} tone="zinc" size="lg" />
              <p className="text-[13px] font-medium text-zinc-500">{t("tripEmpty")}</p>
              {canWrite ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-zinc-900 px-3 text-[12px] font-semibold text-white transition hover:bg-zinc-800"
                >
                  <PencilLine className="h-3.5 w-3.5" aria-hidden />
                  {t("detail.addTrip")}
                </button>
              ) : null}
            </div>
          )}
        </Section>

        <Section icon={IdCard} tone="violet" title={t("detail.details")} testId="lead-detail-details">
          <div className="divide-y divide-zinc-100">
            <Row
              leading={
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-[12px] font-bold text-zinc-600" aria-hidden>
                  {initials(lead.ownerName || "?")}
                </span>
              }
              label={t("fields.owner")}
              value={lead.ownerName || "—"}
              action={
                canWrite ? (
                  <AssignLeadDialog
                    lead={lead}
                    repository={repository}
                    onAssigned={onChanged}
                    trigger={<RowButton icon={Repeat2} label={t("detail.change")} />}
                  />
                ) : null
              }
            />
            <Row
              leading={<IconTile icon={UserRound} tone="indigo" size="lg" />}
              label={t("fields.customer")}
              value={lead.customerId ? t("detail.customerLinked") : t("noCustomer")}
              muted={!lead.customerId}
              action={lead.customerId ? <RowLink href={routes.customer(lead.customerId)} label={t("detail.open")} /> : null}
            />
            {isOpen ? (
              <Row
                leading={
                  <IconTile icon={lead.noFollowUp ? BellOff : BellRing} tone={lead.noFollowUp ? "amber" : "emerald"} size="lg" />
                }
                label={t("detail.followUp")}
                value={lead.noFollowUp ? t("detail.followUpOff") : t("detail.followUpOn")}
                action={
                  canWrite ? (
                    <RowButton
                      icon={lead.noFollowUp ? BellRing : BellOff}
                      label={lead.noFollowUp ? t("clearNoFollowUp") : t("markNoFollowUp")}
                      onClick={() => void toggleFollowUp()}
                      disabled={togglingFollowUp}
                      testId="lead-detail-followup"
                    />
                  ) : null
                }
              />
            ) : null}
            {lead.convertedBookingId ? (
              <Row
                leading={<IconTile icon={CircleCheckBig} tone="emerald" size="lg" />}
                label={t("detail.booking")}
                value={t("card.converted")}
                action={<RowLink href={routes.booking(lead.convertedBookingId)} label={t("detail.open")} />}
              />
            ) : null}
            <Row
              leading={<IconTile icon={CalendarPlus} tone="zinc" size="lg" />}
              label={t("detail.created")}
              value={formatDateTime(lead.createdAt, locale)}
              hint={t("detail.updated", { time: formatRelativeTime(lead.updatedAt, locale) })}
            />
          </div>
        </Section>

        {lead.stage === "lost" && (lead.lostReasonCode || lead.lostReason) ? (
          <Section icon={CircleX} tone="rose" title={t("detail.lostTitle")} testId="lead-detail-lost">
            {lead.lostReasonCode ? (
              <p className="text-[14px] font-semibold text-zinc-900">
                {t.has(`lostReasons.${lead.lostReasonCode}`)
                  ? t(`lostReasons.${lead.lostReasonCode as "other"}`)
                  : lead.lostReasonCode}
              </p>
            ) : null}
            {lead.lostReason ? (
              <p dir="auto" className="mt-1 whitespace-pre-wrap text-start text-[13px] leading-relaxed text-zinc-600">
                {lead.lostReason}
              </p>
            ) : null}
          </Section>
        ) : null}

        {lead.notes ? (
          <Section icon={StickyNote} tone="amber" title={t("detail.notes")} testId="lead-detail-notes">
            <p dir="auto" className="whitespace-pre-wrap text-start text-[13.5px] leading-relaxed text-zinc-700">
              {lead.notes}
            </p>
          </Section>
        ) : null}

        <Section icon={History} tone="indigo" title={t("historyTitle")} testId="lead-detail-history">
          {history.length === 0 ? (
            <p className="text-[13px] text-zinc-500">{t("historyEmpty")}</p>
          ) : (
            <ol className="relative">
              {history.map((h, i) => {
                const to = stageLook(h.toStage);
                const last = i === history.length - 1;
                return (
                  <li key={h.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {!last ? <span className="absolute start-[19px] top-11 bottom-1 w-px bg-zinc-200" aria-hidden /> : null}
                    <IconTile icon={to.icon} tone={to.tone} size="lg" />
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-zinc-900">
                        {h.fromStage ? (
                          <>
                            <span className="font-medium text-zinc-500">{t(`stages.${h.fromStage as "new"}`)}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-zinc-300 rtl:rotate-180" aria-hidden />
                            <span>{t(`stages.${h.toStage as "new"}`)}</span>
                          </>
                        ) : (
                          <span>
                            {t("detail.leadCreated")} · {t(`stages.${h.toStage as "new"}`)}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[11.5px] font-medium text-zinc-400">{formatDateTime(h.createdAt, locale)}</p>
                      {h.note ? (
                        <p dir="auto" className="mt-1.5 rounded-xl bg-zinc-50 px-2.5 py-1.5 text-start text-[12px] text-zinc-600">
                          {h.note}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Section>
      </DrawerBody>

      <DrawerFooter className="justify-between gap-2 border-zinc-200/60 bg-white px-5 py-3.5">
        <LeadStageMenu lead={lead} repository={repository} onChanged={onChanged} />
        <div className="flex items-center gap-2">
          {onDelete && !lead.convertedBookingId ? (
            <button
              type="button"
              onClick={() => onDelete(lead)}
              aria-label={t("delete.action")}
              title={t("delete.action")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-100 transition hover:bg-rose-100 hover:text-rose-700"
              data-testid="lead-detail-delete"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
          <ConvertLeadDialog
            lead={lead}
            repository={repository}
            onConverted={(updated) => onChanged(updated)}
            trigger={
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-50 px-3 text-[12.5px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100 transition hover:bg-emerald-100"
                data-testid="lead-detail-convert"
              >
                <CircleCheckBig className="h-4 w-4" aria-hidden />
                {t("convert")}
              </button>
            }
          />
          {canWrite ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 text-[12.5px] font-semibold text-white shadow-[0_6px_14px_-8px_rgba(15,23,42,0.7)] transition hover:bg-zinc-800"
              data-testid="lead-detail-edit"
            >
              <PencilLine className="h-4 w-4" aria-hidden />
              {t("edit")}
            </button>
          ) : null}
        </div>
      </DrawerFooter>

      <LeadFormDialog repository={repository} open={editing} onOpenChange={setEditing} lead={lead} onSaved={onChanged} />
    </>
  );
}

type TripFact = {
  key: string;
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  hint?: string;
  wide: boolean;
};

function tripFacts(v: {
  travel: string;
  travelHint: string;
  pax: string;
  budget: string;
  pkg: string;
  pkgHint: string;
  labels: { travel: string; pax: string; budget: string; pkg: string };
}): TripFact[] {
  const paired = Boolean(v.travel && v.pax);
  const facts: TripFact[] = [];
  if (v.travel) facts.push({ key: "travel", icon: CalendarDays, tone: "sky", label: v.labels.travel, value: v.travel, hint: v.travelHint, wide: !paired });
  if (v.pax) facts.push({ key: "pax", icon: UsersRound, tone: "violet", label: v.labels.pax, value: v.pax, wide: !paired });
  if (v.budget) facts.push({ key: "budget", icon: Wallet, tone: "emerald", label: v.labels.budget, value: v.budget, wide: true });
  if (v.pkg) facts.push({ key: "pkg", icon: Package, tone: "amber", label: v.labels.pkg, value: v.pkg, hint: v.pkgHint, wide: true });
  return facts;
}

function Section({
  icon,
  tone,
  title,
  action,
  testId,
  children,
}: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  action?: ReactNode;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-[24px] border border-zinc-200/60 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      data-testid={testId}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <IconTile icon={icon} tone={tone} />
        <h3 className="flex-1 text-[14px] font-semibold tracking-tight text-zinc-950">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function SectionAction({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}

function TripTile({
  icon,
  tone,
  label,
  value,
  hint,
  className,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3 rounded-2xl bg-zinc-50/80 p-3", className)}>
      <IconTile icon={icon} tone={tone} size="lg" className="bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)]" />
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-zinc-400">{label}</p>
        <p dir="auto" className={cn("truncate text-start text-[14px] font-semibold", value ? "text-zinc-900" : "text-zinc-300")}>
          {value || "—"}
        </p>
        {hint ? (
          <p dir="auto" className="truncate text-start text-[11.5px] text-zinc-500">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Row({
  leading,
  label,
  value,
  hint,
  muted,
  action,
}: {
  leading: ReactNode;
  label: string;
  value: string;
  hint?: string;
  muted?: boolean;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      {leading}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium text-zinc-400">{label}</p>
        <p dir="auto" className={cn("truncate text-start text-[13.5px] font-semibold", muted ? "text-zinc-400" : "text-zinc-900")}>
          {value}
        </p>
        {hint ? <p className="truncate text-[11.5px] text-zinc-400">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

const rowActionClass =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl bg-zinc-50 px-2.5 text-[12px] font-semibold text-zinc-600 ring-1 ring-inset ring-zinc-200/70 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50";

function RowButton({
  icon: Icon,
  label,
  testId,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string; testId?: string }) {
  return (
    <button type="button" className={rowActionClass} data-testid={testId} {...rest}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}

function RowLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={rowActionClass}>
      {label}
      <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
    </Link>
  );
}
