"use client";

import { useTranslations } from "next-intl";
import { ChevronRight, Flag, Mail, MessageCircle, PhoneCall } from "lucide-react";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { ProgressRing, TONES } from "@/shared/ui";
import { COMPLETE_PROFILE_PCT, passportStatus, profileCompleteness, type Customer } from "../model";
import { CustomerAvatar } from "./customer-avatar";
import { PASSPORT_LOOK } from "./look";

type Props = {
  customer: Customer;
  href: string;
  /** `YYYY-MM-DD` the passport status is judged against. */
  today: string;
};

/** List card: who, how to reach them, and whether they are ready to travel. */
export function CustomerCard({ customer, href, today }: Props) {
  const t = useTranslations("customers.card");
  const tp = useTranslations("customers.passportStatus");
  const passport = passportStatus(customer, today);
  const look = PASSPORT_LOOK[passport];
  const PassportIcon = look.icon;
  const completeness = profileCompleteness(customer);
  const phone = customer.phone.replace(/[^\d+]/g, "");

  return (
    <article
      className="group relative flex h-full flex-col rounded-[28px] border border-zinc-200/60 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-28px_rgba(15,23,42,0.5)]"
      data-testid="customer-card"
    >
      <Link href={href} className="absolute inset-0 rounded-[28px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20" aria-label={customer.fullName} />
      <div className="flex items-start gap-3.5">
        <CustomerAvatar id={customer.id} name={customer.fullName} size="lg" />
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="truncate text-start text-[16px] font-semibold tracking-tight text-zinc-950">
            <bdi>{customer.fullName}</bdi>
          </h3>
          {customer.fullNameAr ? (
            <p lang="ar" className="truncate text-start text-[13px] font-medium text-zinc-500">
              <bdi dir="rtl">{customer.fullNameAr}</bdi>
            </p>
          ) : (
            <p dir="ltr" className="truncate text-start text-[13px] font-medium tabular-nums text-zinc-500">
              {customer.phone}
            </p>
          )}
        </div>
        <ProgressRing
          value={completeness}
          size={40}
          thickness={5}
          tone={completeness >= COMPLETE_PROFILE_PCT ? "emerald" : completeness >= 50 ? "amber" : "rose"}
          label={<span className="text-[10px] font-bold tabular-nums text-zinc-700">{completeness}</span>}
          aria-label={t("completeness", { pct: completeness })}
        />
      </div>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {customer.nationality ? (
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold", TONES.rose.soft)}>
            <Flag className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
            {customer.nationality}
          </span>
        ) : null}
        <span
          className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold", TONES[look.tone].soft)}
          data-testid="customer-card-passport"
        >
          <PassportIcon className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
          {passport === "missing" ? t("noPassport") : tp(passport)}
        </span>
      </div>

      <div className="relative mt-auto flex items-center gap-1.5 pt-4">
        <Contact href={phone ? `tel:${phone}` : undefined} label={t("call")} tone="teal" icon={PhoneCall} />
        <Contact
          href={phone ? `https://wa.me/${phone.replace(/^\+/, "")}` : undefined}
          label={t("whatsapp")}
          tone="emerald"
          icon={MessageCircle}
          external
        />
        <Contact href={customer.email ? `mailto:${customer.email}` : undefined} label={t("email")} tone="violet" icon={Mail} />
        <span className="ms-auto inline-flex items-center gap-0.5 text-[12px] font-semibold text-zinc-400 transition group-hover:text-zinc-700">
          {t("open")}
          <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </span>
      </div>
    </article>
  );
}

function Contact({
  href,
  label,
  tone,
  icon: Icon,
  external,
}: {
  href?: string;
  label: string;
  tone: "teal" | "emerald" | "violet";
  icon: typeof PhoneCall;
  external?: boolean;
}) {
  const cls = "relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-xl transition";
  if (!href) {
    return (
      <span className={cn(cls, "bg-zinc-50 text-zinc-300")} aria-hidden>
        <Icon className="h-4 w-4" />
      </span>
    );
  }
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      className={cn(cls, TONES[tone].soft, "hover:scale-105")}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      <Icon className="h-4 w-4" strokeWidth={2.2} />
    </a>
  );
}
