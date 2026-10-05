"use client";

import { Suspense, useMemo } from "react";
import { createFinanceRepository } from "@/entities/finance";
import { LoadingState } from "@/shared/ui";
import { FinanceHub } from "@/widgets/finance-hub";
import { FinanceQueuesPanel } from "@/widgets/finance-queues-board";

export function FinanceHubView() {
  const repository = useMemo(() => createFinanceRepository(), []);
  return (
    <Suspense fallback={<LoadingState variant="cards" withHeader />}>
      <FinanceHub repository={repository} queues={<FinanceQueuesPanel />} />
    </Suspense>
  );
}
