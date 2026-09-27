"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Download, ShieldCheck, UserX } from "lucide-react";
import type { Customer, CustomerRepository } from "@/entities/customer";
import { AnonymizeCustomerDialog } from "@/features/anonymize-customer";
import { useExportCustomerData } from "@/features/export-customer-data";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui";

type Props = {
  customer: Customer;
  repository: CustomerRepository;
  onAnonymized: () => void;
};

/** KVKK actions; renders nothing without `privacy.manage`. */
export function PrivacyMenu({ customer, repository, onAnonymized }: Props) {
  const t = useTranslations("privacy");
  const exportData = useExportCustomerData(repository);
  const [anonymizeOpen, setAnonymizeOpen] = useState(false);

  if (!exportData.allowed) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" disabled={exportData.busy} data-testid="customer-privacy-menu">
            <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
            {t("menu")}
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => void exportData.run(customer.id)} data-testid="customer-export-data">
            <Download className="h-4 w-4" strokeWidth={1.75} />
            {t("export")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={Boolean(customer.anonymizedAt)}
            onSelect={() => setAnonymizeOpen(true)}
            className="text-red-600 focus:bg-red-50 focus:text-red-700"
            data-testid="customer-anonymize"
          >
            <UserX className="h-4 w-4" strokeWidth={1.75} />
            {t("anonymize")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AnonymizeCustomerDialog
        customer={customer}
        repository={repository}
        open={anonymizeOpen}
        onOpenChange={setAnonymizeOpen}
        onAnonymized={onAnonymized}
      />
    </>
  );
}
