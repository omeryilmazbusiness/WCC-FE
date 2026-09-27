"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useViewer } from "@/entities/viewer";
import { loginHref } from "@/shared/api/session-end";
import { useToast } from "@/shared/ui";
import { logout } from "../model/auth-api";

/** Ends the UI session when the refresh session lapses (access tokens rotate in the BFF). */
export function SessionExpiryWatcher() {
  const { expiresAt } = useViewer();
  const locale = useLocale();
  const { push } = useToast();
  const t = useTranslations("auth");

  useEffect(() => {
    const tick = async () => {
      if (Date.now() < expiresAt) return;
      push({ title: t("sessionExpired"), tone: "error" });
      await logout();
      window.location.assign(loginHref(locale, "expired"));
    };
    void tick();
    const id = window.setInterval(() => void tick(), 30_000);
    return () => window.clearInterval(id);
  }, [expiresAt, locale, push, t]);

  return null;
}
