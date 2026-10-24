"use client";

import { IdleLogoutForm } from "@/features/idle-logout";

/** GM-only company desk lock. */
export function SessionSection() {
  return (
    <div data-testid="session-section">
      <IdleLogoutForm />
    </div>
  );
}
