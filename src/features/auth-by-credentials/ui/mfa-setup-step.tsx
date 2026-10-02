"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ShieldAlert } from "lucide-react";
import type { MfaEnrollResponse } from "@/shared/api/auth-contract";
import { isApiError } from "@/shared/api/api-error";
import { MfaEnrollFlow } from "@/shared/ui/mfa";
import { confirmMfaSetup, startMfaSetup } from "../model/auth-api";
import { GlassButton, GlassError, GlassNotice } from "./glass-controls";

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
    <div className="animate-setup-in space-y-5" data-testid="mfa-setup-step">
      <GlassNotice role="alert" tone="warning" icon={<ShieldAlert className="h-4 w-4" strokeWidth={1.75} />}>
        {t("enrollmentRequired")}
      </GlassNotice>
      {enrollment ? (
        // The enrollment flow (QR, codes) is drawn for light surfaces.
        <div className="rounded-[22px] bg-white p-4 text-zinc-950 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.8)] [color-scheme:light] [--border:#e4e4e7]">
          <MfaEnrollFlow
            enrollment={enrollment}
            confirm={confirm}
            onCancel={() => onBack()}
            onEnabled={() => home.current && onComplete(home.current)}
          />
        </div>
      ) : failed ? (
        <div className="space-y-3">
          <GlassError>{t("enrollError")}</GlassError>
          <GlassButton type="button" onClick={() => onBack()}>
            {t("cancel")}
          </GlassButton>
        </div>
      ) : (
        <div className="flex justify-center py-6" aria-busy>
          <Loader2 className="h-6 w-6 animate-spin text-white/70" strokeWidth={2} />
        </div>
      )}
    </div>
  );
}
