import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SessionEndReason } from "@/shared/api/auth-contract";

/** Informational banner on the login page after the BFF ended the session. */
export function SessionEndedNotice({ reason }: { reason: SessionEndReason }) {
  const t = useTranslations("auth");
  return (
    <div
      role="status"
      data-testid="session-ended-notice"
      className="flex items-start gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" strokeWidth={1.75} />
      <p className="text-sm font-medium text-zinc-700">
        {reason === "revoked" ? t("signedOutDevice") : t("sessionExpired")}
      </p>
    </div>
  );
}
