"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Cake,
  Flag,
  ListTodo,
  Mail,
  MessageCircle,
  PencilLine,
  PhoneCall,
  Plane,
  ShieldOff,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  COMPLETE_PROFILE_PCT,
  CustomerAvatar,
  PASSPORT_LOOK,
  ageOn,
  passportStatus,
  profileCompleteness,
  type Customer,
  type CustomerStats,
} from "@/entities/customer";
import { colorIndex } from "@/shared/lib/avatar";
import { cn } from "@/shared/lib/cn";
import { localDay } from "@/shared/lib/day";
import { formatDate, formatMoneyShort, formatRelativeTime } from "@/shared/lib/format";
import { ProgressRing, TONES, type Tone } from "@/shared/ui";

const COVER_TONES: Tone[] = ["sky", "indigo", "violet", "teal", "emerald", "amber", "rose"];

type Props = {
  customer: Customer;
  stats: CustomerStats;
  canWrite: boolean;
  onEdit: () => void;
  /** "New booking" trigger, when the viewer may create bookings. */
  bookingAction?: ReactNode;
  menu: ReactNode;
};

function digits(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export function ProfileHero({ customer, stats, canWrite, onEdit, bookingAction, menu }: Props) {
  const t = useTranslations("customers.profile");
  const tp = useTranslations("customers.passportStatus");
  const locale = useLocale();
  const today = localDay();
  const tone = customer.anonymizedAt ? "zinc" : COVER_TONES[colorIndex(customer.id, COVER_TONES.length)];
  const age = ageOn(customer.dateOfBirth, today);
  const passport = passportStatus(customer, today);
  const passportLook = PASSPORT_LOOK[passport];
  const completeness = profileCompleteness(customer);
  const paid = Object.entries(stats.paid).sort((a, b) => b[1] - a[1]);
  const phone = digits(customer.phone);
  const anonymized = Boolean(customer.anonymizedAt);

  return (
    <section
      className="overflow-hidden rounded-[32px] border border-zinc-200/60 bg-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)]"
      data-testid="customer-hero"
    >
      <div className={cn("relative h-28 bg-gradient-to-br sm:h-32", TONES[tone].tint)}>
        <div
          className={cn("absolute inset-0 opacity-[0.16]", TONES[tone].gradient)}
          style={{ maskImage: "radial-gradient(120% 140% at 0% 0%, black, transparent 70%)" }}
          aria-hidden
        />
        <div className="absolute end-4 top-4 flex items-center gap-2">
          {canWrite && !anonymized ? (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-zinc-950 px-4 text-[13px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(15,23,42,0.8)] transition hover:bg-zinc-800"
              data-testid="customer-edit"
            >
              <PencilLine className="h-4 w-4" aria-hidden />
              {t("edit")}
            </button>
          ) : null}
          {menu}
        </div>
      </div>

      <div className="px-5 pb-5 sm:px-7 sm:pb-6">
        <div className="relative -mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:gap-5">
          <CustomerAvatar
            id={customer.id}
            name={customer.fullName}
            size="xl"
            muted={anonymized}
            className="ring-[6px] ring-white"
          />
          <div className="min-w-0 flex-1 sm:pb-1">
            <h1 className="truncate text-start text-[26px] font-semibold leading-tight tracking-tight text-zinc-950 sm:text-[30px]">
              <bdi>{customer.fullName}</bdi>
            </h1>
            {customer.fullNameAr ? (
              <p lang="ar" className="truncate text-start text-[15px] font-medium text-zinc-500">
                <bdi dir="rtl">{customer.fullNameAr}</bdi>
              </p>
            ) : null}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {anonymized ? <Chip icon={ShieldOff} tone="zinc" label={t("anonymized")} /> : null}
              {customer.nationality ? <Chip icon={Flag} tone="rose" label={customer.nationality} /> : null}
              {age !== null ? <Chip icon={Cake} tone="amber" label={t("age", { age })} /> : null}
              {passport !== "missing" ? (
                <Chip icon={passportLook.icon} tone={passportLook.tone} label={tp(passport)} testId="customer-passport-status" />
              ) : null}
              <Chip icon={Sparkles} tone="zinc" label={t("since", { date: formatDate(customer.createdAt, locale) })} />
            </div>
          </div>
        </div>

        {!anonymized ? (
          <div className="mt-5 grid grid-cols-4 gap-2 sm:flex sm:flex-wrap" data-testid="customer-quick-actions">
            <QuickAction href={phone ? `tel:${phone}` : undefined} icon={PhoneCall} tone="teal" label={t("call")} />
            <QuickAction
              href={phone ? `https://wa.me/${phone.replace(/^\+/, "")}` : undefined}
              external
              icon={MessageCircle}
              tone="emerald"
              label={t("whatsapp")}
            />
            <QuickAction href={customer.email ? `mailto:${customer.email}` : undefined} icon={Mail} tone="violet" label={t("email")} />
            {bookingAction}
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <Stat icon={Plane} tone="sky" label={t("stats.bookings")} value={String(stats.bookings)} />
          <Stat
            icon={Wallet}
            tone="emerald"
            label={t("stats.paid")}
            value={paid.length ? formatMoneyShort(paid[0][1], locale, paid[0][0]) : "—"}
            hint={paid.length > 1 ? t("stats.moreCurrencies", { count: paid.length - 1 }) : undefined}
          />
          <Stat
            icon={ListTodo}
            tone="indigo"
            label={t("stats.openTasks")}
            value={String(stats.openTasks)}
            hint={stats.lastActivityAt ? t("stats.lastActivity", { time: formatRelativeTime(stats.lastActivityAt, locale) }) : undefined}
          />
          <div className="flex items-center gap-3 rounded-[22px] bg-zinc-50/90 p-3.5 ring-1 ring-inset ring-zinc-100">
            <ProgressRing
              value={completeness}
              size={48}
              thickness={6}
              tone={completeness >= COMPLETE_PROFILE_PCT ? "emerald" : completeness >= 50 ? "amber" : "rose"}
              label={<span className="text-[11px] font-bold tabular-nums text-zinc-800">{completeness}</span>}
              aria-label={t("stats.completeness")}
            />
            <div className="min-w-0">
              <p className="truncate text-[11.5px] font-medium text-zinc-400">{t("stats.completeness")}</p>
              <p className="truncate text-[17px] font-semibold tabular-nums text-zinc-950">{completeness}%</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Chip({ icon: Icon, tone, label, testId }: { icon: LucideIcon; tone: Tone; label: string; testId?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold", TONES[tone].soft)}
      data-testid={testId}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
      <span dir="auto">{label}</span>
    </span>
  );
}

const quickShell =
  "group flex min-w-0 flex-col items-center gap-1.5 rounded-[22px] bg-zinc-50/90 px-3 py-3 ring-1 ring-inset ring-zinc-100 transition sm:min-w-[96px]";

export function QuickAction({
  href,
  external,
  onClick,
  icon: Icon,
  tone,
  label,
  testId,
}: {
  href?: string;
  external?: boolean;
  onClick?: () => void;
  icon: LucideIcon;
  tone: Tone;
  label: string;
  testId?: string;
}) {
  const body = (
    <>
      <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl transition group-hover:scale-105", TONES[tone].solid)}>
        <Icon className="h-5 w-5" strokeWidth={2.2} aria-hidden />
      </span>
      <span className="truncate text-[12px] font-semibold text-zinc-700">{label}</span>
    </>
  );
  if (href) {
    return (
      <a
        href={href}
        className={cn(quickShell, "hover:bg-white hover:ring-zinc-200")}
        data-testid={testId}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {body}
      </a>
    );
  }
  if (onClick) {
    return <QuickActionButton icon={Icon} tone={tone} label={label} onClick={onClick} data-testid={testId} />;
  }
  return (
    <span className={cn(quickShell, "cursor-not-allowed opacity-45")} aria-disabled data-testid={testId}>
      {body}
    </span>
  );
}

type QuickActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; tone: Tone; label: string };

/** Button form of a quick action; forwards ref and props so it can be a dialog trigger. */
export const QuickActionButton = forwardRef<HTMLButtonElement, QuickActionButtonProps>(
  ({ icon: Icon, tone, label, className, ...props }, ref) => (
    <button ref={ref} type="button" className={cn(quickShell, "hover:bg-white hover:ring-zinc-200", className)} {...props}>
      <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl transition group-hover:scale-105", TONES[tone].solid)}>
        <Icon className="h-5 w-5" strokeWidth={2.2} aria-hidden />
      </span>
      <span className="truncate text-[12px] font-semibold text-zinc-700">{label}</span>
    </button>
  ),
);
QuickActionButton.displayName = "QuickActionButton";

function Stat({ icon: Icon, tone, label, value, hint }: { icon: LucideIcon; tone: Tone; label: string; value: string; hint?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[22px] bg-zinc-50/90 p-3.5 ring-1 ring-inset ring-zinc-100">
      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", TONES[tone].solid)}>
        <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11.5px] font-medium text-zinc-400">{label}</p>
        <p className="truncate text-[19px] font-semibold leading-tight tabular-nums text-zinc-950">{value}</p>
        {hint ? <p className="truncate text-[11px] text-zinc-400">{hint}</p> : null}
      </div>
    </div>
  );
}