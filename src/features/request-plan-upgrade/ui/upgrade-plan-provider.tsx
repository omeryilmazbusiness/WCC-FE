"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useViewer } from "@/entities/viewer";
import type { GuardedRoute } from "@/shared/config/permissions";
import type { NavLabel } from "@/widgets/app-shell/model/nav";
import { upgradeTarget, type UpgradeTarget } from "../model/target";
import { UpgradePlanDialog } from "./upgrade-plan-dialog";

type Ctx = {
  open: (href: GuardedRoute, label: NavLabel) => void;
};

const UpgradePlanContext = createContext<Ctx | null>(null);

export function UpgradePlanProvider({ children }: { children: ReactNode }) {
  const viewer = useViewer();
  const [target, setTarget] = useState<UpgradeTarget | null>(null);
  const open = useCallback(
    (href: GuardedRoute, label: NavLabel) => {
      setTarget(upgradeTarget(href, label, viewer.workspace?.company.plan, viewer.permissions));
    },
    [viewer.permissions, viewer.workspace?.company.plan],
  );
  const value = useMemo(() => ({ open }), [open]);
  return (
    <UpgradePlanContext.Provider value={value}>
      {children}
      <UpgradePlanDialog target={target} onClose={() => setTarget(null)} />
    </UpgradePlanContext.Provider>
  );
}

export function useUpgradePlan(): Ctx {
  const ctx = useContext(UpgradePlanContext);
  if (!ctx) throw new Error("useUpgradePlan must be used within UpgradePlanProvider");
  return ctx;
}
