"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ClipboardCheck, FileStack, HeartPulse, IdCard, Pencil, Stamp, Trash2, UserPlus, Users } from "lucide-react";
import type { Booking, BookingChecklistItem, BookingParticipant, BookingReadiness, BookingRepository } from "@/entities/booking";
import { useCan } from "@/entities/viewer";
import { ParticipantDialog } from "@/features/booking-actions";
import { BookingOpsPanel } from "@/widgets/booking-ops-panel";
import { cn } from "@/shared/lib/cn";
import { formatDay } from "@/shared/lib/format";
import { Button, EmptyState, InitialsAvatar, MaskedSecret, useMutationFeedback } from "@/shared/ui";
import { ReadinessCard } from "./readiness-card";
import { WorkspaceSection } from "./section";

type Props = {
  booking: Booking;
  participants: BookingParticipant[];
  checklist: BookingChecklistItem[];
  readiness: BookingReadiness | null;
  repository: BookingRepository;
  onChanged: () => void;
};

export function PaxTab({ booking, participants, checklist, readiness, repository, onChanged }: Props) {
  const t = useTranslations("bookingWorkspace.pax");
  const te = useTranslations("bookingWorkspace.errors");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const canWrite = useCan("bookings.write");
  const canRevealPii = useCan("pii.read");
  const [editing, setEditing] = useState<BookingParticipant | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const terminal = booking.status === "cancelled" || booking.status === "completed";
  const removable = booking.status === "draft" || booking.status === "quoted";
  const canAdd = canWrite && !terminal && participants.length < booking.paxCount;

  const openDialog = (p: BookingParticipant | null) => {
    setEditing(p);
    setDialogOpen(true);
  };

  async function remove(p: BookingParticipant) {
    try {
      await repository.deleteParticipant(booking.id, p.id);
      feedback.success(t("removed"));
      onChanged();
    } catch (err) {
      feedback.error(err, te("save"));
    }
  }

  async function toggle(item: BookingChecklistItem) {
    try {
      await repository.updateChecklist(booking.id, item.id, !item.completed);
      onChanged();
    } catch (err) {
      feedback.error(err, te("save"));
    }
  }

  return (
    <div className="space-y-4" data-testid="booking-tab-pax">
      {readiness ? <ReadinessCard booking={booking} readiness={readiness} repository={repository} onChanged={onChanged} /> : null}
      <WorkspaceSection
        icon={Users}
        tone="sky"
        title={t("title")}
        aside={
          <span className="flex items-center gap-2">
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[12px] font-semibold tabular-nums text-zinc-600">
              {t("count", { done: participants.length, total: booking.paxCount })}
            </span>
            {canAdd ? (
              <Button size="sm" onClick={() => openDialog(null)} data-testid="participant-add">
                <UserPlus className="h-4 w-4" aria-hidden />
                {t("add")}
              </Button>
            ) : null}
          </span>
        }
      >
        {participants.length === 0 ? (
          <EmptyState icon={Users} title={t("empty")} description={t("emptyHint")} />
        ) : (
          <ul className="grid gap-2.5 lg:grid-cols-2">
            {participants.map((p) => (
              <li key={p.id} className="rounded-[20px] border border-zinc-200/70 bg-gradient-to-br from-white to-zinc-50/60 p-3.5" data-testid="participant-card">
                <div className="flex items-start gap-3">
                  <InitialsAvatar id={p.id} name={p.fullName} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-semibold text-zinc-950">{p.fullName}</p>
                    <p className="text-[12px] text-zinc-500">
                      {[p.gender ? t(p.gender) : "", p.dateOfBirth ? formatDay(p.dateOfBirth, locale) : "", p.nationality].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  {canWrite && !terminal ? (
                    <div className="flex shrink-0 gap-1">
                      <IconAction label={t("edit")} onClick={() => openDialog(p)} icon={Pencil} />
                      {removable ? <IconAction label={t("remove")} onClick={() => void remove(p)} icon={Trash2} danger /> : null}
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[12.5px]">
                  <div className="flex min-w-0 items-center gap-1.5 rounded-xl bg-white px-2.5 py-1.5 ring-1 ring-zinc-100">
                    <IdCard className="h-3.5 w-3.5 shrink-0 text-indigo-500" aria-hidden />
                    <MaskedSecret
                      id={p.id}
                      masked={p.passportNo}
                      canReveal={canRevealPii}
                      onReveal={() => repository.revealParticipantPassport(booking.id, p.id)}
                      emptyLabel={t("passportMissing")}
                    />
                  </div>
                  <div className="flex min-w-0 items-center gap-1.5 rounded-xl bg-white px-2.5 py-1.5 ring-1 ring-zinc-100" title={t("nationalId")}>
                    <span className="text-[10.5px] font-bold text-zinc-400">ID</span>
                    <span className="truncate font-mono" dir="ltr">
                      {p.nationalId || "—"}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Tick ok={p.healthOk} icon={HeartPulse} label={p.healthOk ? t("healthOk") : t("healthMissing")} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {!canAdd && canWrite && !terminal && participants.length >= booking.paxCount && booking.paxCount > 0 ? (
          <p className="mt-3 text-[12px] text-zinc-400">{t("full")}</p>
        ) : null}
      </WorkspaceSection>

      <WorkspaceSection icon={ClipboardCheck} tone="emerald" title={t("checklist")}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {checklist.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                disabled={!canWrite}
                onClick={() => void toggle(item)}
                aria-pressed={item.completed}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition",
                  item.completed ? "border-emerald-200 bg-emerald-50/70" : "border-zinc-200/70 bg-white hover:bg-zinc-50",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                    item.completed ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-400",
                  )}
                  aria-hidden
                >
                  ✓
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold text-zinc-900">{item.label}</span>
                  <span className="text-[11.5px] text-zinc-500">{item.required ? t("required") : t("optional")}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </WorkspaceSection>

      <WorkspaceSection
        icon={Stamp}
        tone="rose"
        title={t("visa")}
        aside={booking.info.visaPending > 0 ? <span className="text-[12px] font-semibold text-rose-600">{t("visaPending", { count: booking.info.visaPending })}</span> : null}
      >
        <BookingOpsPanel bookingId={booking.id} participants={participants} section="visa" onChanged={onChanged} />
      </WorkspaceSection>

      <WorkspaceSection icon={FileStack} tone="violet" title={t("documents")}>
        <BookingOpsPanel bookingId={booking.id} participants={participants} section="documents" onChanged={onChanged} />
      </WorkspaceSection>

      <ParticipantDialog
        bookingId={booking.id}
        repository={repository}
        participant={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={onChanged}
      />
    </div>
  );
}

function IconAction({ label, onClick, icon: Icon, danger }: { label: string; onClick: () => void; icon: typeof Pencil; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-xl transition",
        danger ? "text-rose-500 hover:bg-rose-50" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}

function Tick({ ok, icon: Icon, label }: { ok: boolean; icon: typeof Pencil; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold",
        ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}
