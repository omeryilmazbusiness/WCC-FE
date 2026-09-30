"use client";

import { Suspense } from "react";
import { ManagerDashboardBoard } from "@/widgets/manager-dashboard";

export function ManagerView() {
  return (
    <Suspense fallback={null}>
      <ManagerDashboardBoard />
    </Suspense>
  );
}
