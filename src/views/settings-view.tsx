"use client";

import type { ReactNode } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { isSettingsDetail, type SettingsDetailId } from "@/shared/config/settings";
import { SettingsDetail, SettingsLayout, SettingsWelcome } from "@/widgets/settings-hub";
import { SettingsSectionBody } from "@/widgets/settings-sections";

/** Persistent split view: the list keeps its state and scroll while sections change beside it. */
export function SettingsShellView({ children }: { children: ReactNode }) {
  const segment = useSelectedLayoutSegment();
  return <SettingsLayout active={segment && isSettingsDetail(segment) ? segment : undefined}>{children}</SettingsLayout>;
}

export function SettingsHomeView() {
  return <SettingsWelcome />;
}

export function SettingsSectionView({ section }: { section: SettingsDetailId }) {
  return (
    <SettingsDetail section={section}>
      <SettingsSectionBody section={section} />
    </SettingsDetail>
  );
}
