"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createLeadRepository, type Lead } from "@/entities/lead";
import { Screen } from "@/shared/ui";
import { CrmPipelineBoard } from "@/widgets/crm-pipeline";

const repo = createLeadRepository();

export function PipelineView() {
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

  return <CrmPipelineBoard repository={repo} initialLeads={leads} />;
}
