"use client";

import { Screen } from "@/shared/ui";
import { AISetupWelcome } from "@/widgets/ai-setup-welcome";

/** Standalone /setup/ai page. */
export function AISetupView() {
  return (
    <Screen>
      <AISetupWelcome />
    </Screen>
  );
}
