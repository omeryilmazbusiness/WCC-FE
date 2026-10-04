"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, PhoneCall, Unlink, UserPlus, UsersRound } from "lucide-react";
import { CustomerAvatar, type CompanionLink, type CustomerRepository } from "@/entities/customer";
import { LinkCompanionDialog } from "@/features/link-companion";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { ConfirmDialog, EmptyState, useMutationFeedback } from "@/shared/ui";
import { RelationLabel, companionName, companionPhone } from "./parts";

type Props = {
  customerId: string;
  companions: CompanionLink[];
  repository: CustomerRepository;
  canWrite: boolean;
  onChanged: () => void;
};

export function FamilyTab({ customerId, companions, repository, canWrite, onChanged }: Props) {
  const t = useTranslations("customers.profile.family");
  const tc = useTranslations("common");
  const feedback = useMutationFeedback();
  const [unlinking, setUnlinking] = useState<CompanionLink | null>(null);
  const [pending, setPending] = useState(false);

  async function unlink() {
    if (!unlinking) return;
    setPending(true);
    try {
      await repository.unlinkCompanion(customerId, unlinking.companion_id);
      feedback.success(t("removed"));
      setUnlinking(null);
      onChanged();
    } catch (err) {
      feedback.error(err);
    } finally {
      setPending(false);
    }
  }

  const add = canWrite ? (
    <LinkCompanionDialog
      customerId={customerId}
      repository={repository}
      onLinked={() => {
        feedback.success(t("linked"));
        onChanged();
      }}
      trigger={
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-2xl bg-zinc-950 px-4 text-[13px] font-semibold text-white transition hover:bg-zinc-800"
          data-testid="customer-family-add"
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          {t("add")}
        </button>
      }
    />
  ) : null;

  if (companions.length === 0) {
    return (
      <div className="space-y-3" data-testid="customer-family">
        <EmptyState icon={UsersRound} title={t("empty")} description={t("emptyHint")} />
        {add ? <div className="flex justify-center">{add}</div> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="customer-family">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-zinc-500">{t("count", { count: companions.length })}</p>
        {add}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {companions.map((c) => {
          const name = companionName(c);
          const phone = companionPhone(c);
          return (
            <li
              key={c.id}
              className="group relative flex flex-col rounded-[26px] border border-zinc-200/60 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-[0_14px_34px_-24px_rgba(15,23,42,0.45)]"
              data-testid="customer-companion"
            >
              <Link href={routes.customer(c.companion_id)} className="flex items-center gap-3">
                <CustomerAvatar id={c.companion_id} name={name} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-start text-[15px] font-semibold text-zinc-950">
                    <bdi>{name}</bdi>
                  </span>
                  <RelationLabel relation={c.relation} />
                </span>
                <ChevronRight className="h-4 w-4 text-zinc-300 transition group-hover:text-zinc-500 rtl:rotate-180" aria-hidden />
              </Link>
              {c.notes ? (
                <p dir="auto" className="mt-3 line-clamp-2 rounded-2xl bg-zinc-50 px-3 py-2 text-start text-[12.5px] text-zinc-600">
                  {c.notes}
                </p>
              ) : null}
              <div className="mt-3 flex items-center gap-2">
                {phone ? (
                  <a
                    href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                    dir="ltr"
                    className="inline-flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-xl bg-teal-50 px-2.5 text-[12px] font-semibold text-teal-700 transition hover:bg-teal-100"
                  >
                    <PhoneCall className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{phone}</span>
                  </a>
                ) : (
                  <span className="flex-1" />
                )}
                {canWrite ? (
                  <button
                    type="button"
                    onClick={() => setUnlinking(c)}
                    aria-label={t("unlink", { name })}
                    title={t("unlink", { name })}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                  >
                    <Unlink className="h-3.5 w-3.5" aria-hidden />
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={unlinking !== null}
        onOpenChange={(open) => {
          if (!open) setUnlinking(null);
        }}
        title={t("unlinkTitle")}
        description={unlinking ? t("unlinkBody", { name: companionName(unlinking) }) : undefined}
        confirmLabel={t("unlinkConfirm")}
        cancelLabel={tc("cancel")}
        onConfirm={() => void unlink()}
        pending={pending}
        destructive
      />
    </div>
  );
}
