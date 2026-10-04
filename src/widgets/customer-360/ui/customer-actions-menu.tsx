"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Ellipsis, GitMerge, UserPlus, UserX } from "lucide-react";
import type { Customer, CustomerRepository } from "@/entities/customer";
import { useCan } from "@/entities/viewer";
import { AnonymizeCustomerDialog } from "@/features/anonymize-customer";
import { useExportCustomerData } from "@/features/export-customer-data";
import { LinkCompanionDialog } from "@/features/link-companion";
import { MergeCustomerDialog } from "@/features/merge-customer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui";

type Props = {
  customer: Customer;
  repository: CustomerRepository;
  onLinked: () => void;
  onMerged: () => void;
  onAnonymized: () => void;
};

type OpenDialog = "link" | "merge" | "anonymize" | null;

/**
 * Secondary profile actions. Dialogs live outside the menu so closing the menu does not
 * unmount them; items the viewer may not use are left out, and so is the menu itself.
 */
export function CustomerActionsMenu({ customer, repository, onLinked, onMerged, onAnonymized }: Props) {
  const t = useTranslations("customers.profile.menu");
  const canWrite = useCan("customers.write");
  const exportData = useExportCustomerData(repository);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const anonymized = Boolean(customer.anonymizedAt);
  const canEdit = canWrite && !anonymized;

  if (!canEdit && !exportData.allowed) return null;

  const close = (open: boolean) => {
    if (!open) setDialog(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("label")}
            title={t("label")}
            disabled={exportData.busy}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/90 text-zinc-700 shadow-[0_6px_18px_-10px_rgba(15,23,42,0.5)] ring-1 ring-inset ring-zinc-200/70 backdrop-blur transition hover:bg-white hover:text-zinc-950 disabled:opacity-60"
            data-testid="customer-actions-menu"
          >
            <Ellipsis className="h-5 w-5" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 rounded-2xl p-1.5">
          {canEdit ? (
            <>
              <DropdownMenuItem onSelect={() => setDialog("link")} className="gap-2.5 rounded-xl py-2" data-testid="customer-link-companion">
                <UserPlus className="h-4 w-4 text-sky-600" aria-hidden />
                {t("linkCompanion")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDialog("merge")} className="gap-2.5 rounded-xl py-2" data-testid="customer-merge">
                <GitMerge className="h-4 w-4 text-violet-600" aria-hidden />
                {t("merge")}
              </DropdownMenuItem>
            </>
          ) : null}
          {canEdit && exportData.allowed ? <DropdownMenuSeparator /> : null}
          {exportData.allowed ? (
            <>
              <DropdownMenuItem
                onSelect={() => void exportData.run(customer.id)}
                className="gap-2.5 rounded-xl py-2"
                data-testid="customer-export-data"
              >
                <Download className="h-4 w-4 text-emerald-600" aria-hidden />
                {t("export")}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={anonymized}
                onSelect={() => setDialog("anonymize")}
                className="gap-2.5 rounded-xl py-2 text-rose-600 focus:bg-rose-50 focus:text-rose-700"
                data-testid="customer-anonymize"
              >
                <UserX className="h-4 w-4" aria-hidden />
                {t("anonymize")}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {canEdit ? (
        <>
          <LinkCompanionDialog
            customerId={customer.id}
            repository={repository}
            open={dialog === "link"}
            onOpenChange={close}
            onLinked={onLinked}
          />
          <MergeCustomerDialog
            target={customer}
            repository={repository}
            open={dialog === "merge"}
            onOpenChange={close}
            onMerged={onMerged}
          />
        </>
      ) : null}
      {exportData.allowed ? (
        <AnonymizeCustomerDialog
          customer={customer}
          repository={repository}
          open={dialog === "anonymize"}
          onOpenChange={close}
          onAnonymized={onAnonymized}
        />
      ) : null}
    </>
  );
}
