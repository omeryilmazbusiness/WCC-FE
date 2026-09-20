"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  clearSession,
  isSessionExpired,
} from "@/features/auth-by-credentials";
import { routes } from "@/shared/config/routes";
import { useRouter } from "@/shared/i18n/navigation";
import { useToast } from "@/shared/ui";

/** Polls client expiry and redirects to login (T-018). */
export function SessionExpiryWatcher() {
  const router = useRouter();
  const { push } = useToast();
  const t = useTranslations("auth");

  useEffect(() => {
    const tick = () => {
      if (!isSessionExpired()) return;
      clearSession();
      push({ title: t("sessionExpired"), tone: "error" });
      router.replace(routes.login);
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [push, router, t]);

  return null;
}
