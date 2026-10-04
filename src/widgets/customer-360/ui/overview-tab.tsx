"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  BadgeCheck,
  BookUser,
  Cake,
  CalendarClock,
  CircleDashed,
  ClipboardList,
  Flag,
  Globe2,
  History,
  IdCard,
  Mail,
  MessageCircle,
  PhoneCall,
  StickyNote,
  UserRound,
  UsersRound,
  Accessibility,
  type LucideIcon,
} from "lucide-react";
import {
  CustomerAvatar,
  PASSPORT_LOOK,
  ageOn,
  missingProfileFields,
  passportStatus,
  type CompanionLink,
  type Customer,
  type CustomerRepository,
  type ProfileField,
  type TimelineItem,
} from "@/entities/customer";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { localDay } from "@/shared/lib/day";
import { formatDate, formatDay } from "@/shared/lib/format";
import { IconTile, InfoRow, InfoSection, MaskedSecret, TONES, infoActionClass } from "@/shared/ui";
import { CountBadge, RelationLabel, companionName } from "./parts";
import { TimelineList } from "./timeline-list";

const FIELD_ICON: Record<ProfileField, LucideIcon> = {
  phone: PhoneCall,
  email: Mail,
  nationality: Flag,
  passport: IdCard,
  passportExpiry: CalendarClock,
  dateOfBirth: Cake,
  nameAr: Globe2,
};

type Props = {
  customer: Customer;
  repository: CustomerRepository;
  canRevealPii: boolean;
  canWrite: boolean;
  companions: CompanionLink[];
  timeline: TimelineItem[];
  onEdit: () => void;
  onOpenTab: (tab: string) => void;
};

export function OverviewTab({ customer, repository, canRevealPii, canWrite, companions, timeline, onEdit, onOpenTab }: Props) {
  const t = useTranslations("customers.profile");
  const tp = useTranslations("customers.passportStatus");
  const locale = useLocale();
  const today = localDay();
  const age = ageOn(customer.dateOfBirth, today);
  const passport = passportStatus(customer, today);
  const look = PASSPORT_LOOK[passport];
  const missing = missingProfileFields(customer);
  const editable = canWrite && !customer.anonymizedAt;
  const phone = customer.phone.replace(/[^\d+]/g, "");

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]" data-testid="customer-overview">
      <div className="min-w-0 space-y-4">
        <InfoSection icon={UserRound} tone="sky" title={t("sections.personal")} data-testid="customer-personal">
          <div className="divide-y divide-zinc-100">
            <InfoRow
              icon={PhoneCall}
              tone="teal"
              label={t("fields.phone")}
              value={customer.phone || "—"}
              muted={!customer.phone}
              dir="ltr"
              action={
                phone ? (
                  <a href={`https://wa.me/${phone.replace(/^\+/, "")}`} target="_blank" rel="noopener noreferrer" className={infoActionClass}>
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                    {t("whatsapp")}
                  </a>
                ) : null
              }
            />
            <InfoRow
              icon={Mail}
              tone="violet"
              label={t("fields.email")}
              value={customer.email || t("notSet")}
              muted={!customer.email}
              dir="ltr"
              action={
                customer.email ? (
                  <a href={`mailto:${customer.email}`} className={infoActionClass}>
                    {t("write")}
                    <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
                  </a>
                ) : null
              }
            />
            <InfoRow icon={Flag} tone="rose" label={t("fields.nationality")} value={customer.nationality || t("notSet")} muted={!customer.nationality} />
            <InfoRow
              icon={Cake}
              tone="amber"
              label={t("fields.dateOfBirth")}
              value={customer.dateOfBirth ? formatDate(customer.dateOfBirth, locale) : t("notSet")}
              hint={age !== null ? t("age", { age }) : undefined}
              muted={!customer.dateOfBirth}
            />
            <InfoRow
              icon={Globe2}
              tone="indigo"
              label={t("fields.nameAr")}
              value={customer.fullNameAr ? <bdi dir="rtl" lang="ar">{customer.fullNameAr}</bdi> : t("notSet")}
              muted={!customer.fullNameAr}
            />
          </div>
        </InfoSection>

        <InfoSection
          icon={BookUser}
          tone="violet"
          title={t("sections.documents")}
          data-testid="customer-documents"
          badge={
            passport !== "missing" ? (
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", TONES[look.tone].soft)}>
                {tp(passport)}
              </span>
            ) : null
          }
        >
          <div className="divide-y divide-zinc-100">
            <InfoRow
              icon={IdCard}
              tone="violet"
              label={t("fields.passport")}
              value={
                customer.passportNo ? (
                  <MaskedSecret
                    id={customer.id}
                    masked={customer.passportNo}
                    canReveal={canRevealPii}
                    onReveal={() => repository.revealPassport(customer.id)}
                  />
                ) : (
                  t("notSet")
                )
              }
              muted={!customer.passportNo}
              dir="ltr"
            />
            <InfoRow
              icon={look.icon}
              tone={look.tone}
              label={t("fields.passportExpiry")}
              value={customer.passportExpiresAt ? formatDay(customer.passportExpiresAt.slice(0, 10), locale) : t("notSet")}
              hint={
                passport === "expired"
                  ? t("passportExpiredHint")
                  : passport === "expiring"
                    ? t("passportExpiringHint")
                    : undefined
              }
              muted={!customer.passportExpiresAt}
              data-testid="customer-passport-expiry"
            />
          </div>
        </InfoSection>

        <InfoSection icon={StickyNote} tone="amber" title={t("sections.notes")} data-testid="customer-notes">
          <div className="space-y-3">
            <NoteBlock icon={Accessibility} tone="rose" label={t("fields.specialRequirements")} text={customer.specialRequirements} empty={t("noRequirements")} />
            <NoteBlock icon={ClipboardList} tone="amber" label={t("fields.notes")} text={customer.notes} empty={t("noNotes")} />
          </div>
        </InfoSection>
      </div>

      <div className="min-w-0 space-y-4">
        <InfoSection
          icon={missing.length ? CircleDashed : BadgeCheck}
          tone={missing.length ? "amber" : "emerald"}
          title={t("sections.completeness")}
          data-testid="customer-completeness"
        >
          {missing.length === 0 ? (
            <p className="text-[13px] font-medium text-emerald-700">{t("complete")}</p>
          ) : (
            <>
              <p className="mb-2.5 text-[12.5px] text-zinc-500">{t("missingHint", { count: missing.length })}</p>
              <ul className="space-y-1.5">
                {missing.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 rounded-2xl bg-zinc-50/90 px-2.5 py-2">
                    <IconTile icon={FIELD_ICON[f]} tone="zinc" size="sm" />
                    <span className="flex-1 truncate text-[13px] font-medium text-zinc-700">{t(`missing.${f}`)}</span>
                  </li>
                ))}
              </ul>
              {editable ? (
                <button type="button" onClick={onEdit} className={cn(infoActionClass, "mt-3 w-full justify-center")}>
                  {t("completeProfile")}
                </button>
              ) : null}
            </>
          )}
        </InfoSection>

        <InfoSection
          icon={UsersRound}
          tone="indigo"
          title={t("sections.family")}
          badge={companions.length ? <CountBadge n={companions.length} /> : null}
          action={
            companions.length ? (
              <button type="button" onClick={() => onOpenTab("family")} className={infoActionClass}>
                {t("seeAll")}
              </button>
            ) : null
          }
        >
          {companions.length === 0 ? (
            <p className="text-[13px] text-zinc-500">{t("familyEmpty")}</p>
          ) : (
            <ul className="space-y-1.5">
              {companions.slice(0, 4).map((c) => (
                <li key={c.id}>
                  <Link
                    href={routes.customer(c.companion_id)}
                    className="flex items-center gap-3 rounded-2xl p-1.5 transition hover:bg-zinc-50"
                  >
                    <CustomerAvatar id={c.companion_id} name={companionName(c)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-start text-[13.5px] font-semibold text-zinc-900">
                        <bdi>{companionName(c)}</bdi>
                      </span>
                      <RelationLabel relation={c.relation} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </InfoSection>

        <InfoSection
          icon={History}
          tone="zinc"
          title={t("sections.recent")}
          action={
            timeline.length ? (
              <button type="button" onClick={() => onOpenTab("activity")} className={infoActionClass}>
                {t("seeAll")}
              </button>
            ) : null
          }
        >
          {timeline.length === 0 ? (
            <p className="text-[13px] text-zinc-500">{t("recentEmpty")}</p>
          ) : (
            <TimelineList items={timeline.slice(0, 5)} compact data-testid="customer-recent" />
          )}
        </InfoSection>
      </div>
    </div>
  );
}

function NoteBlock({ icon, tone, label, text, empty }: { icon: LucideIcon; tone: "rose" | "amber"; label: string; text?: string; empty: string }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-zinc-50/80 p-3">
      <IconTile icon={icon} tone={tone} size="lg" className="bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)]" />
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-medium text-zinc-400">{label}</p>
        <p dir="auto" className={cn("mt-0.5 whitespace-pre-wrap text-start text-[13.5px] leading-relaxed", text?.trim() ? "text-zinc-800" : "text-zinc-400")}>
          {text?.trim() || empty}
        </p>
      </div>
    </div>
  );
}