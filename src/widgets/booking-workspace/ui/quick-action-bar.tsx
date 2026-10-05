"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Ban, BadgeCheck, CreditCard, PencilLine, Repeat2, Share2, Shuffle, TimerReset, type LucideIcon } from "lucide-react";
import type { AllowedTransition, Booking, BookingRepository, BookingStatus, BookingWorkspaceRepository } from "@/entities/booking";
import { useCan } from "@/entities/viewer";
import {
  CancelBookingDialog,
  ChangeRequestDialog,
  EditBookingProfileDialog,
  ExtendHoldDialog,
  PaymentLinkDialog,
  ShareBookingDialog,
  type ShareContact,
} from "@/features/booking-actions";
import { StatusTransitionDialog } from "@/features/change-booking-status";
import { ConfirmBookingTasksButton } from "@/features/confirm-booking-tasks";
import { cn } from "@/shared/lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  TONES,
  type Tone,
} from "@/shared/ui";

type Dialog = "profile" | "cancel" | "change" | "extend" | "share" | "pay" | null;

type Props = {
  booking: Booking;
  contact: ShareContact;
  companyName: string;
  repository: BookingRepository;
  workspace: BookingWorkspaceRepository;
  onBooking: (booking: Booking | null) => void;
  /** Activity-producing actions that don't return a booking (notes feed refresh). */
  onActivity: () => void;
};

/** Issue, void, reissue, extend, share and collect — one tap each. */
export function QuickActionBar({ booking, contact, companyName, repository, workspace, onBooking, onActivity }: Props) {
  const t = useTranslations("bookingWorkspace.actions");
  const tStatus = useTranslations("bookingStatus");
  const canWrite = useCan("bookings.write");
  const canCollect = useCan("payments.write");
  const canCreateTasks = useCan("tasks.write");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [transition, setTransition] = useState<AllowedTransition | null>(null);
  const [guards, setGuards] = useState<Partial<Record<BookingStatus, string[]>>>({});

  const confirm = booking.allowedTransitions.find((tr) => tr.status === "confirmed");
  const cancellable = booking.allowedTransitions.some((tr) => tr.status === "cancelled");
  const otherTransitions = booking.allowedTransitions.filter((tr) => tr.status !== "confirmed" && tr.status !== "cancelled");
  const terminal = booking.status === "cancelled" || booking.status === "completed";
  const close = (open: boolean) => !open && setDialog(null);

  const tiles: { key: string; icon: LucideIcon; tone: Tone; label: string; onClick: () => void; show: boolean }[] = [
    { key: "confirm", icon: BadgeCheck, tone: "emerald", label: t("confirm"), onClick: () => confirm && setTransition(confirm), show: canWrite && Boolean(confirm) },
    { key: "extend", icon: TimerReset, tone: "amber", label: t("extend"), onClick: () => setDialog("extend"), show: canWrite && booking.status === "option_hold" },
    { key: "pay", icon: CreditCard, tone: "violet", label: t("paymentLink"), onClick: () => setDialog("pay"), show: canCollect && !terminal && booking.balanceAmt > 0 },
    { key: "share", icon: Share2, tone: "sky", label: t("share"), onClick: () => setDialog("share"), show: true },
    { key: "change", icon: Repeat2, tone: "indigo", label: t("change"), onClick: () => setDialog("change"), show: canWrite && !terminal },
    { key: "profile", icon: PencilLine, tone: "zinc", label: t("editProfile"), onClick: () => setDialog("profile"), show: canWrite },
    { key: "cancel", icon: Ban, tone: "rose", label: t("cancel"), onClick: () => setDialog("cancel"), show: canWrite && cancellable },
  ];

  return (
    <div data-testid="booking-quick-actions">
      <p className="sr-only">{t("label")}</p>
      <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {tiles
          .filter((tile) => tile.show)
          .map(({ key, icon: Icon, tone, label, onClick }) => (
            <button
              key={key}
              type="button"
              onClick={onClick}
              data-testid={`quick-${key}`}
              className="group flex w-[84px] shrink-0 flex-col items-center gap-1.5 rounded-[22px] p-2 text-center transition hover:bg-white hover:shadow-[0_12px_30px_-22px_rgba(15,23,42,0.5)]"
            >
              <span className={cn("flex h-12 w-12 items-center justify-center rounded-[18px] transition group-hover:scale-105", TONES[tone].gradient)}>
                <Icon className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
              </span>
              <span className="line-clamp-2 text-[11.5px] font-semibold leading-tight text-zinc-700">{label}</span>
            </button>
          ))}
        {canWrite && otherTransitions.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-testid="quick-status"
                className="group flex w-[84px] shrink-0 flex-col items-center gap-1.5 rounded-[22px] p-2 text-center transition hover:bg-white hover:shadow-[0_12px_30px_-22px_rgba(15,23,42,0.5)]"
              >
                <span className={cn("flex h-12 w-12 items-center justify-center rounded-[18px] transition group-hover:scale-105", TONES.teal.gradient)}>
                  <Shuffle className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
                </span>
                <span className="line-clamp-2 text-[11.5px] font-semibold leading-tight text-zinc-700">{t("status")}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {otherTransitions.map((tr) => (
                <DropdownMenuItem key={tr.status} onSelect={() => setTransition(tr)} data-testid={`quick-status-${tr.status}`}>
                  {tStatus(`actions.${tr.status}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        {canCreateTasks && booking.status === "confirmed" ? (
          <div className="flex shrink-0 items-center ps-1">
            <ConfirmBookingTasksButton bookingId={booking.id} label={booking.refCode || booking.id.slice(0, 8)} customerId={booking.customerId} />
          </div>
        ) : null}
      </div>

      {transition ? (
        <StatusTransitionDialog
          key={`${booking.id}-${transition.status}`}
          booking={booking}
          transition={transition}
          repository={repository}
          knownGuards={guards[transition.status] ?? []}
          onGuards={(g) => setGuards((prev) => ({ ...prev, [transition.status]: g }))}
          onOpenChange={(open) => !open && setTransition(null)}
          onChanged={(updated) => {
            setGuards({});
            onBooking(updated);
          }}
        />
      ) : null}
      <EditBookingProfileDialog booking={booking} workspace={workspace} open={dialog === "profile"} onOpenChange={close} onSaved={onBooking} />
      <CancelBookingDialog
        booking={booking}
        repository={repository}
        workspace={workspace}
        open={dialog === "cancel"}
        onOpenChange={close}
        onCancelled={onBooking}
      />
      <ChangeRequestDialog bookingId={booking.id} workspace={workspace} open={dialog === "change"} onOpenChange={close} onRequested={() => onBooking(null)} />
      <ExtendHoldDialog booking={booking} workspace={workspace} open={dialog === "extend"} onOpenChange={close} onExtended={onBooking} />
      <ShareBookingDialog
        booking={booking}
        contact={contact}
        companyName={companyName}
        workspace={workspace}
        open={dialog === "share"}
        onOpenChange={close}
        onShared={onActivity}
      />
      <PaymentLinkDialog booking={booking} contact={contact} workspace={workspace} open={dialog === "pay"} onOpenChange={close} onShared={onActivity} />
    </div>
  );
}
