"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldAlert } from "lucide-react";
import type { MfaEnrollResponse } from "@/shared/api/auth-contract";
import { isApiError } from "@/shared/api/api-error";
import { Button } from "@/shared/ui/button";
import { MfaEnrollFlow } from "@/shared/ui/mfa";
import { confirmMfaSetup, startMfaSetup } from "../model/auth-api";

type Props = {
  onComplete: (home: string) => void;
  onBack: (message?: string) => void;
};

/** GM/Admin without MFA get no session until TOTP is set up (backend policy). */
export function MfaSetupStep({ onComplete, onBack }: Props) {
  const t = useTranslations("security");
  const tAuth = useTranslations("auth");
  const [enrollment, setEnrollment] = useState<MfaEnrollResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const home = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    startMfaSetup()
      .then((res) => active && setEnrollment(res))
      .catch((err) => {
        if (!active) return;
        if (isApiError(err) && err.status === 401) onBack(tAuth("mfaSetupExpired"));
        else setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [onBack, tAuth]);

  async function confirm(code: string) {
    const res = await confirmMfaSetup(code);
    home.current = res.home;
    return res;
  }

  return (
    <div className="space-y-6" data-testid="mfa-setup-step">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4" role="alert">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" strokeWidth={1.75} />
        <p className="text-sm font-medium text-zinc-700">{t("enrollmentRequired")}</p>
      </div>
      {enrollment ? (
        <MfaEnrollFlow
          enrollment={enrollment}
          confirm={confirm}
          onCancel={() => onBack()}
          onEnabled={() => home.current && onComplete(home.current)}
        />
      ) : failed ? (
        <div className="space-y-3">
          <p className="text-sm text-[var(--destructive)]" role="alert">
            {t("enrollError")}
          </p>
          <Button type="button" variant="ghost" onClick={() => onBack()}>
            {t("cancel")}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">…</p>
      )}
    </div>
  );
}
