"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { type CompanyPlan } from "@/entities/company/plan";
import { useViewer } from "@/entities/viewer";
import type { GuardedRoute } from "@/shared/config/permissions";
import type { NavLabel } from "@/widgets/app-shell/model/nav";
import { upgradeAskForPlan, upgradeTarget, type UpgradeTarget } from "../model/target";
import { UpgradePlanDialog } from "./upgrade-plan-dialog";

type Ctx = {
  open: (href: GuardedRoute, label: NavLabel) => void;
  openPlan: (next: CompanyPlan) => void;
};

const UpgradePlanContext = createContext<Ctx | null>(null);

export function UpgradePlanProvider({ children }: { children: ReactNode }) {
  const viewer = useViewer();
  const tMembership = useTranslations("settings.sections.membership");
  const [target, setTarget] = useState<UpgradeTarget | null>(null);
  const plan = viewer.workspace?.company.plan;
  const open = useCallback(
    (href: GuardedRoute, label: NavLabel) => {
      setTarget(upgradeTarget(href, label, plan, viewer.permissions));
    },
    [plan, viewer.permissions],
  );
  const openPlan = useCallback(
    (next: CompanyPlan) => {
      setTarget(upgradeAskForPlan(plan, next, tMembership("title")));
    },
    [plan, tMembership],
  );
  const value = useMemo(() => ({ open, openPlan }), [open, openPlan]);
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
