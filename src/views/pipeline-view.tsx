"use client";

import { createLeadRepository } from "@/entities/lead";
import { CrmPipelineBoard } from "@/widgets/crm-pipeline";

const repo = createLeadRepository();

export function PipelineView() {
  return <CrmPipelineBoard repository={repo} />;
}
