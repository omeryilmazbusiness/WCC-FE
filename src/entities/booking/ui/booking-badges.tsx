"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import { TONES } from "@/shared/ui";
import type { PaymentStatus, SalesChannel, ServiceType, TicketStatus } from "../model";
import { CHANNEL_LOOK, PAYMENT_LOOK, SERVICE_LOOK, TICKET_LOOK, type Look } from "./look";

type PillProps = { look: Look; label: string; testId?: string; className?: string; size?: "sm" | "md" };

function LookPill({ look, label, testId, className, size = "sm" }: PillProps) {
  const Icon = look.icon;
  return (
    <span
      data-testid={testId}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold",
        size === "sm" ? "px-2.5 py-1 text-[11.5px]" : "px-3 py-1.5 text-[12.5px]",
        TONES[look.tone].soft,
        className,
      )}
    >
      <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} strokeWidth={2.2} aria-hidden />
      {label}
    </span>
  );
}

export function ServiceTypeBadge({ type, className, size }: { type: ServiceType; className?: string; size?: "sm" | "md" }) {
  const t = useTranslations("bookingWorkspace.service");
  return <LookPill look={SERVICE_LOOK[type]} label={t(type)} testId="booking-service" className={className} size={size} />;
}

export function TicketStatusBadge({ status, className, size }: { status: TicketStatus; className?: string; size?: "sm" | "md" }) {
  const t = useTranslations("bookingWorkspace.ticket");
  return <LookPill look={TICKET_LOOK[status]} label={t(status)} testId="booking-ticket" className={className} size={size} />;
}

export function PaymentStatusBadge({ status, className, size }: { status: PaymentStatus; className?: string; size?: "sm" | "md" }) {
  const t = useTranslations("bookingWorkspace.payment");
  return <LookPill look={PAYMENT_LOOK[status]} label={t(status)} testId="booking-payment" className={className} size={size} />;
}

export function ChannelBadge({ channel, className }: { channel: SalesChannel; className?: string }) {
  const t = useTranslations("bookingWorkspace.channel");
  return <LookPill look={CHANNEL_LOOK[channel]} label={t(channel)} testId="booking-channel" className={className} />;
}

/** Big rounded icon tile for a service type (list rows, drawer header). */
export function ServiceIconTile({ type, size = "md", className }: { type: ServiceType; size?: "md" | "lg"; className?: string }) {
  const look = SERVICE_LOOK[type];
  const Icon = look.icon;
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center",
        size === "lg" ? "h-14 w-14 rounded-[20px]" : "h-11 w-11 rounded-2xl",
        TONES[look.tone].gradient,
        className,
      )}
    >
      <Icon className={size === "lg" ? "h-7 w-7" : "h-[22px] w-[22px]"} strokeWidth={2} />
    </span>
  );
}
