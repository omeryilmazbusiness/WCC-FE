"use client";

import { useViewer } from "@/entities/viewer";
import type { SessionBranch } from "@/shared/api/session";
import { useWorkspaceRef } from "@/shared/i18n/navigation";
import { resolveBranch } from "@/shared/lib/workspace-path";

/** Branch the current page works in (from the workspace URL), else the home branch. */
export function useActiveBranch(): SessionBranch | null {
  const ws = useViewer().workspace;
  const ref = useWorkspaceRef();
  if (!ws) return null;
  return resolveBranch(ws.branches, { urlSlug: ref?.branch, homeId: ws.homeBranchId });
}

/** Active branch id with the viewer's own branch as the fallback. */
export function useActiveBranchId(): string {
  const viewer = useViewer();
  return useActiveBranch()?.id ?? viewer.user.branchId;
}
