"use client";

import { Suspense } from "react";
import { NotificationCenterBoard } from "@/widgets/notification-center";

export function NotificationsView() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">…</p>}>
      <NotificationCenterBoard />
    </Suspense>
  );
}
