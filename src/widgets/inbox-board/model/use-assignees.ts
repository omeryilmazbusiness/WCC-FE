"use client";

import { useEffect, useState } from "react";
import { listUsers } from "@/entities/identity";

export type Assignee = { id: string; name: string; role: string };

export type AssigneeLoader = (branchId: string) => Promise<Assignee[]>;

/** Roles that hold inbox.write, so they can answer what they are given. */
const ASSIGNABLE_ROLES = new Set(["gm", "manager", "employee", "operations"]);

/** Active front-office users of the branch, by name. */
export const loadBranchAssignees: AssigneeLoader = async (branchId) => {
  const users = await listUsers({ branchId, limit: 100 });
  return users
    .filter((u) => u.is_active && ASSIGNABLE_ROLES.has(u.role))
    .map((u) => ({ id: u.id, name: u.full_name || u.email, role: u.role }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

/** Team members a conversation can be handed to; empty when the viewer may not list users. */
export function useAssignees(loader: AssigneeLoader, branchId: string, enabled: boolean) {
  const [assignees, setAssignees] = useState<Assignee[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let stale = false;
    loader(branchId)
      .then((list) => {
        if (!stale) setAssignees(list);
      })
      .catch(() => {
        if (!stale) setAssignees([]);
      });
    return () => {
      stale = true;
    };
  }, [loader, branchId, enabled]);

  return enabled ? assignees : [];
}
