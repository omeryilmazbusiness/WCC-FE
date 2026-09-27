"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldAlert, ShieldCheck, Smartphone } from "lucide-react";
import type { MfaEnrollResponse } from "@/shared/api/auth-contract";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { useMutationFeedback } from "@/shared/ui";
import { useRefreshViewer, useViewer } from "@/entities/viewer";
import { confirmMfa, enrollMfa } from "../model/mfa-api";
import { MfaDisableDialog } from "./mfa-disable-dialog";
import { MfaEnrollFlow } from "@/shared/ui/mfa";
import { RegenerateCodesDialog } from "./regenerate-codes-dialog";

type Props = {
  /** Login demanded enrollment before any other screen is reachable. */
  enrollmentRequired?: boolean;
};

export function MfaSettingsCard({ enrollmentRequired }: Props) {
  const t = useTranslations("security");
  const viewer = useViewer();
  const refreshViewer = useRefreshViewer();
  const feedback = useMutationFeedback();
  const [enrollment, setEnrollment] = useState<MfaEnrollResponse | null>(null);
  const [starting, setStarting] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);

  const enabled = Boolean(viewer.user.mfaEnabled);
  const mustEnroll = !enabled && (enrollmentRequired || viewer.mfaEnrollmentRequired);

  async function start() {
    setStarting(true);
    try {
      setEnrollment(await enrollMfa());
    } catch (err) {
      feedback.error(err, t("enrollError"));
    } finally {
      setStarting(false);
    }
  }

  async function finishEnrollment() {
    setEnrollment(null);
    const next = await refreshViewer();
    if (mustEnroll && next && !next.mfaEnrollmentRequired) {
      // Middleware gated every route on enrollment; reload so it re-reads the cookie.
      window.location.reload();
    }
  }

  return (
    <Card data-testid="mfa-card">
      <CardHeader>
        <div className="flex items-start gap-4">
          <span
            className={cn(
              "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
              enabled ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-700",
            )}
          >
            <Smartphone className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{t("mfaTitle")}</CardTitle>
              <Badge
                className={cn(
                  "normal-case",
                  enabled ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600",
                )}
              >
                {enabled ? t("statusOn") : t("statusOff")}
              </Badge>
            </div>
            <CardDescription>{t("mfaDescription")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {mustEnroll ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4"
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" strokeWidth={1.75} />
            <p className="text-sm font-medium text-zinc-700">{t("enrollmentRequired")}</p>
          </div>
        ) : null}

        {enrollment ? (
          <MfaEnrollFlow
            enrollment={enrollment}
            confirm={confirmMfa}
            onCancel={() => setEnrollment(null)}
            onEnabled={() => void finishEnrollment()}
          />
        ) : enabled ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="me-auto flex items-center gap-2 text-sm font-medium text-zinc-600">
              <ShieldCheck className="h-4 w-4 text-emerald-600" strokeWidth={1.75} />
              {t("enabledHint")}
            </p>
            <Button type="button" variant="outline" onClick={() => setRegenerateOpen(true)}>
              {t("regenerate")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setDisableOpen(true)}>
              {t("disable")}
            </Button>
          </div>
        ) : (
          <Button type="button" onClick={() => void start()} disabled={starting}>
            {t("setup")}
          </Button>
        )}
      </CardContent>

      <MfaDisableDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        onDisabled={() => void refreshViewer()}
      />
      <RegenerateCodesDialog open={regenerateOpen} onOpenChange={setRegenerateOpen} />
    </Card>
  );
}
