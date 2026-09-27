"use client";

import { useTranslations } from "next-intl";
import { createLeadRepository } from "@/entities/lead";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { QueryState, Screen } from "@/shared/ui";
import { CrmPipelineBoard } from "@/widgets/crm-pipeline";

const repo = createLeadRepository();

export function PipelineView() {
  const tc = useTranslations("common");
  const query = useApiQuery(() => repo.list(), []);

  if (!query.data) {
    return (
      <Screen>
        <QueryState
          loading={query.loading}
          loadingLabel={tc("loading")}
          error={query.error}
          onRetry={() => void query.reload()}
        >
          {null}
        </QueryState>
      </Screen>
    );
  }

  return <CrmPipelineBoard repository={repo} initialLeads={query.data} />;
}
