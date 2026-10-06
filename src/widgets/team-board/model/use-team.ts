"use client";

import { useMemo } from "react";
import { listAllUsers, listTeams, type Team } from "@/entities/identity";
import { useViewer } from "@/entities/viewer";
import { useActiveBranchId } from "@/features/branch-scope";
import { useApiQuery } from "@/shared/lib/use-api-query";

/**
 * Team members of the active branch. Platform admins (no company) see each company's
 * GM account instead; everyone else is managed inside the company.
 */
export function useTeam() {
  const viewer = useViewer();
  const branchId = useActiveBranchId();
  const platform = !viewer.workspace && viewer.scope === "global";

  const members = useApiQuery(() => listAllUsers({ branchId }), [branchId], {
    cacheKey: ["team-members", branchId ?? null],
  });
  const teams = useApiQuery(() => listTeams(branchId), [branchId], {
    enabled: !platform,
    cacheKey: ["team-units", branchId ?? null],
  });

  const teamById = useMemo(() => new Map<string, Team>((teams.data ?? []).map((t) => [t.id, t])), [teams.data]);

  return {
    platform,
    branchId,
    viewerId: viewer.user.id,
    /** Only company-wide accounts may grant the GM role (API rule). */
    canGrantGm: viewer.scope === "company" || viewer.scope === "global",
    members,
    teams: teams.data ?? [],
    teamById,
  };
}
