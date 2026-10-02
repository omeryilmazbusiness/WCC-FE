import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SessionEndReason } from "@/shared/api/auth-contract";
import { GlassNotice } from "./glass-controls";

/** Informational banner on the login page after the BFF ended the session. */
export function SessionEndedNotice({ reason }: { reason: SessionEndReason }) {
  const t = useTranslations("auth");
  return (
    <GlassNotice
      role="status"
      data-testid="session-ended-notice"
      icon={<Info className="h-4 w-4" strokeWidth={1.75} />}
    >
      {reason === "revoked" ? t("signedOutDevice") : t("sessionExpired")}
    </GlassNotice>
  );
}
