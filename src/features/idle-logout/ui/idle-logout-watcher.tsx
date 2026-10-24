"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useViewer } from "@/entities/viewer";
import { AUTH_ENDPOINTS } from "@/shared/api/auth-contract";
import { bffHttp } from "@/shared/api/http-client";
import { loginHref } from "@/shared/api/session-end";
import { useToast } from "@/shared/ui";
import { IDLE_ACTIVITY_KEY, idleRemainingMs, idleShouldLogout, idleShouldWarn } from "../model/idle-clock";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "click", "scroll", "touchstart", "wheel"] as const;

/** Signs the desk out when the company idle window elapses without a real action. */
export function IdleLogoutWatcher() {
  const viewer = useViewer();
  const locale = useLocale();
  const { push } = useToast();
  const t = useTranslations("auth");
  const minutes = viewer.workspace?.company.idleLogoutMinutes;
  const enabled = Boolean(viewer.workspace) && typeof minutes === "number" && minutes > 0;
  const signingOut = useRef(false);

  useEffect(() => {
    if (!enabled || minutes == null) {
      signingOut.current = false;
      return;
    }

    const read = (): number => {
      try {
        const raw = Number(localStorage.getItem(IDLE_ACTIVITY_KEY));
        if (Number.isFinite(raw) && raw > 0) return raw;
      } catch {
        /* private mode */
      }
      return Date.now();
    };

    const write = (ts: number) => {
      try {
        localStorage.setItem(IDLE_ACTIVITY_KEY, String(ts));
      } catch {
        /* private mode */
      }
    };

    let warned = false;
    const mark = () => {
      warned = false;
      write(Date.now());
    };

    try {
      if (!localStorage.getItem(IDLE_ACTIVITY_KEY)) mark();
    } catch {
      mark();
    }

    const endSession = async () => {
      if (signingOut.current) return;
      signingOut.current = true;
      try {
        localStorage.removeItem(IDLE_ACTIVITY_KEY);
      } catch {
        /* ignore */
      }
      await bffHttp.request(AUTH_ENDPOINTS.logout, { method: "POST" }).catch(() => undefined);
      window.location.assign(loginHref(locale, "idle"));
    };

    const check = () => {
      const remaining = idleRemainingMs(read(), minutes, Date.now());
      if (idleShouldLogout(remaining)) {
        void endSession();
        return;
      }
      if (idleShouldWarn(remaining) && !warned) {
        warned = true;
        push({ title: t("idleWarning"), tone: "info" });
      }
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === IDLE_ACTIVITY_KEY) warned = false;
    };

    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, mark, { capture: true, passive: true });
    }
    window.addEventListener("storage", onStorage);
    const id = window.setInterval(check, 1_000);
    check();
    return () => {
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, mark, true);
      }
      window.removeEventListener("storage", onStorage);
      window.clearInterval(id);
    };
  }, [enabled, minutes, locale, push, t]);

  return null;
}
