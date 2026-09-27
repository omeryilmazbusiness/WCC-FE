"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { CustomerRepository } from "@/entities/customer";
import { useCan } from "@/entities/viewer";
import { saveBlob } from "@/shared/lib/download";
import { useMutationFeedback } from "@/shared/ui";

export function customerExportFilename(customerId: string): string {
  return `customer-${customerId}.json`;
}

/** KVKK data export (`privacy.manage`): downloads the backend bundle as JSON. */
export function useExportCustomerData(repository: CustomerRepository) {
  const t = useTranslations("privacy");
  const allowed = useCan("privacy.manage");
  const feedback = useMutationFeedback();
  const [busy, setBusy] = useState(false);

  async function run(customerId: string) {
    if (!allowed) return;
    setBusy(true);
    try {
      const bundle = await repository.exportData(customerId);
      const blob = new Blob([`${JSON.stringify(bundle, null, 2)}\n`], { type: "application/json" });
      saveBlob(blob, customerExportFilename(customerId));
      feedback.success(t("exported"));
    } catch (err) {
      feedback.error(err, t("exportError"));
    } finally {
      setBusy(false);
    }
  }

  return { allowed, busy, run };
}
