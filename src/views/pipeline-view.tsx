"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MemoryLeadRepository, type Lead } from "@/entities/lead";
import { EmptyState, Screen } from "@/shared/ui";
import { CrmPipelineBoard } from "@/widgets/crm-pipeline";

const repo = new MemoryLeadRepository();

export function PipelineView() {
  const t = useTranslations("pipeline");
  const tc = useTranslations("common");
  const [leads, setLeads] = useState<Lead[] | null>(null);

  useEffect(() => {
    void repo.list().then(setLeads);
  }, []);

  if (!leads) {
    return (
      <Screen>
        <p className="text-sm font-medium text-zinc-500">{tc("loading")}</p>
      </Screen>
    );
  }

  if (leads.length === 0) {
    return (
      <Screen>
        <EmptyState title={t("empty")} description={t("emptyHint")} />
      </Screen>
    );
  }

  return <CrmPipelineBoard repository={repo} initialLeads={leads} />;
}
