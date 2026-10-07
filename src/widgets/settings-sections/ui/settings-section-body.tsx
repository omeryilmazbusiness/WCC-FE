"use client";

import type { SettingsDetailId } from "@/shared/config/settings";
import { AuditSection } from "./audit/audit-section";
import { FaqSection } from "./faq/faq-section";
import { ProfileSection } from "./profile/profile-section";
import { RolesSection } from "./roles-section";

/** Content of one settings detail screen. */
export function SettingsSectionBody({ section }: { section: SettingsDetailId }) {
  switch (section) {
    case "profile":
      return <ProfileSection />;
    case "roles":
      return <RolesSection />;
    case "audit":
      return <AuditSection />;
    case "faq":
      return <FaqSection />;
  }
}
