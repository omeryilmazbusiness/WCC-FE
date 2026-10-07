"use client";

import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { aiStatus, createAIRepository, type AISetup } from "@/entities/ai";
import { AIProviderForm } from "@/features/ai-setup";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { QueryState } from "@/shared/ui";
import { ConnectionCard } from "./connection-card";
import { FeatureGrid, GuardrailList } from "./feature-grid";
import { WelcomeHero } from "./welcome-hero";

/** /setup/ai: welcome screen that explains WODI AI and connects the branch's own provider. */
export function AISetupWelcome() {
  const t = useTranslations("aiSetup");
  const repo = useMemo(() => createAIRepository(), []);
  const query = useApiQuery(() => repo.getSetup(), [repo], { cacheKey: ["ai-setup"] });
  const setup = query.data ?? null;
  const status = aiStatus(setup);
  const [editing, setEditing] = useState(false);
  const connectRef = useRef<HTMLDivElement>(null);
  const showForm = status === "off" || editing;

  function changed(next: AISetup) {
    query.setData(next);
    setEditing(false);
  }

  function focusConnect() {
    connectRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <QueryState loadingVariant="lines" loading={query.loading && !setup} error={query.error} onRetry={() => void query.reload()}>
      <div className="mx-auto w-full max-w-6xl pb-12" data-testid="ai-setup-welcome" data-status={status}>
        <WelcomeHero status={status} onStart={status === "off" ? focusConnect : undefined} />

        <div className="mt-8 grid gap-8 lg:mt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-10">
          <div className="order-2 space-y-10 lg:order-1">
            <FeatureGrid />
            <GuardrailList />
          </div>

          <div ref={connectRef} className="order-1 scroll-mt-6 space-y-4 lg:order-2 lg:sticky lg:top-6 lg:self-start">
            {setup ? <ConnectionCard repo={repo} setup={setup} onChange={changed} editing={editing} onEdit={() => setEditing(true)} /> : null}
            {showForm ? (
              <section
                className="rounded-[28px] bg-white p-5 ring-1 ring-zinc-200/60 shadow-[0_24px_60px_-40px_rgba(24,24,27,0.35)] sm:p-6"
                data-testid="ai-connect-card"
              >
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[20px] font-bold tracking-tight text-zinc-950">{editing ? t("editTitle") : t("connectTitle")}</h2>
                    <p className="mt-0.5 text-[13.5px] leading-snug text-zinc-500">{t("connectBody")}</p>
                  </div>
                  {editing ? (
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200"
                      aria-label={t("cancel")}
                      data-testid="ai-edit-cancel"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  ) : null}
                </div>
                <AIProviderForm repo={repo} initial={setup} onSaved={changed} />
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </QueryState>
  );
}
