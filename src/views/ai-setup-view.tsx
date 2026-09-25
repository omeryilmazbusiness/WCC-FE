"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Sparkles } from "lucide-react";
import { createAIRepository, type AISetup } from "@/entities/ai";
import { AIProviderForm } from "@/features/ai-setup/ui/ai-provider-form";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { Button, Screen } from "@/shared/ui";

/** Standalone /setup/ai page — same BYO form as dashboard wizard step 1. */
export function AISetupView() {
  const t = useTranslations("aiSetup");
  const repo = useMemo(() => createAIRepository(), []);
  const [initial, setInitial] = useState<AISetup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void repo
      .getSetup()
      .then((s) => {
        if (!cancelled) setInitial(s);
      })
      .catch(() => {
        if (!cancelled) setInitial(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repo]);

  if (loading) {
    return (
      <Screen>
        <div className="py-16 text-center text-sm font-medium text-zinc-400">
          …
        </div>
      </Screen>
    );
  }

  const ready = Boolean(initial?.configured && initial?.enabled);

  return (
    <Screen>
      <div className="mx-auto w-full max-w-xl space-y-6 py-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
            <Sparkles className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
              {t("title")}
            </h1>
            <p className="text-sm font-medium text-zinc-500">{t("subtitle")}</p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
          <ul className="space-y-2 text-sm font-medium text-zinc-700">
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              {t("point1")}
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              {t("point2")}
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              {t("point3")}
            </li>
          </ul>
          <AIProviderForm
            initial={initial}
            onSaved={(s) => setInitial(s)}
          />
        </div>

        {ready ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
            <p className="text-sm font-semibold text-emerald-900">
              {t("readyTitle")}
            </p>
            <p className="mt-1 text-sm font-medium text-emerald-800">
              {t("readyBody")}
            </p>
            <Button asChild type="button" variant="ghost" className="mt-3">
              <Link href={routes.manager}>{t("goDashboard")}</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </Screen>
  );
}
