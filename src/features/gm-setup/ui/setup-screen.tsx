"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Rocket } from "lucide-react";
import { createSetupRepository, type SetupOverview, type SetupStepKey } from "@/entities/setup";
import { useRouter } from "@/shared/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { ErrorState, LoadingState, useMutationFeedback } from "@/shared/ui";
import { initialStep, neighborStep, statusOf, stepOrder } from "../model/flow";
import { AIStep } from "./ai-step";
import { ChannelsStep } from "./channels-step";
import { CompanyStep } from "./company-step";
import { PillButton } from "./glass";
import { SetupDone } from "./setup-done";
import { StaffStep } from "./staff-step";
import { StepDock } from "./step-dock";

type Props = {
  /** Server-rendered overview; the screen fetches itself when it is missing. */
  initial: SetupOverview | null;
};

export function SetupScreen({ initial }: Props) {
  const t = useTranslations("setup");
  const repository = useMemo(() => createSetupRepository(), []);
  const query = useApiQuery(() => repository.get(), [repository], { enabled: initial === null });

  if (initial) return <SetupFlow initial={initial} />;
  if (query.data) return <SetupFlow initial={query.data} />;
  return (
    <SetupFrame>
      <div className="mx-auto flex min-h-dvh max-w-md items-center px-5">
        {query.error ? (
          <ErrorState className="w-full" title={t("loadError")} onRetry={() => void query.reload()} />
        ) : (
          <LoadingState className="w-full" label={t("loading")} />
        )}
      </div>
    </SetupFrame>
  );
}

function SetupFrame({ children }: { children: React.ReactNode }) {
  return <div className="setup-wallpaper min-h-dvh">{children}</div>;
}

function SetupFlow({ initial }: { initial: SetupOverview }) {
  const t = useTranslations("setup");
  const router = useRouter();
  const feedback = useMutationFeedback();
  const repository = useMemo(() => createSetupRepository(), []);
  const [overview, setOverview] = useState(initial);
  const [step, setStep] = useState<SetupStepKey | null>(() => initialStep(initial));
  const [leaving, setLeaving] = useState(false);

  const locked = useCallback(
    (key: SetupStepKey) => key !== "company" && statusOf(overview, "company") === "pending",
    [overview],
  );

  const back = step ? neighborStep(overview, step, -1) : null;
  const goBack = back ? () => setStep(back) : null;

  /** Saves progress and opens the following step, or the summary after the last one. */
  function advanced(next: SetupOverview, from: SetupStepKey) {
    setOverview(next);
    setStep(next.completed ? null : neighborStep(next, from, 1));
  }

  async function later() {
    setLeaving(true);
    try {
      if (!overview.completed) await repository.dismiss();
      router.replace(routes.manager);
    } catch (err) {
      setLeaving(false);
      feedback.error(err, t("actions.laterError"));
    }
  }

  const position = step ? stepOrder(overview).indexOf(step) + 1 : overview.totalSteps;

  return (
    <SetupFrame>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 pt-5 sm:px-8 sm:pt-7">
        <div className="glass-pill flex h-10 items-center gap-2.5 rounded-full ps-1.5 pe-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-950 text-white">
            <Rocket className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          <span className="max-w-[180px] truncate text-[13px] font-semibold tracking-[-0.01em] text-zinc-900">
            {overview.company.nameEn || t("brand")}
          </span>
        </div>
        <PillButton
          variant="glass"
          className="h-10 px-4 text-[13px]"
          onClick={() => void later()}
          disabled={leaving}
          data-testid="setup-later"
        >
          {overview.completed ? t("actions.dashboard") : t("actions.later")}
        </PillButton>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col items-center px-5 pb-16 pt-8 sm:px-8 sm:pt-10">
        <div className="mb-8 space-y-2 text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
            {step ? t("eyebrow", { current: position, total: overview.totalSteps }) : t("eyebrowDone")}
          </p>
          <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-zinc-950 sm:text-[34px]">
            {t("title")}
          </h1>
        </div>

        <StepDock steps={overview.steps} active={step} onSelect={setStep} locked={locked} />

        <section
          key={step ?? "done"}
          className="liquid-glass animate-setup-in mt-10 w-full max-w-[600px] rounded-[32px] p-5 sm:p-8"
          data-testid={`setup-card-${step ?? "done"}`}
        >
          {step === "company" ? (
            <CompanyStep
              overview={overview}
              repository={repository}
              onBack={goBack}
              onSaved={(next) => advanced(next, "company")}
            />
          ) : step === "staff" ? (
            <StaffStep
              overview={overview}
              repository={repository}
              onBack={goBack}
              onChange={setOverview}
              onDone={(next) => advanced(next, "staff")}
            />
          ) : step === "ai" ? (
            <AIStep
              overview={overview}
              repository={repository}
              onBack={goBack}
              onDone={(next) => advanced(next, "ai")}
            />
          ) : step === "channels" ? (
            <ChannelsStep
              overview={overview}
              repository={repository}
              onBack={goBack}
              onFinish={(next) => advanced(next, "channels")}
            />
          ) : (
            <SetupDone overview={overview} onEdit={setStep} onFinish={() => router.replace(routes.manager)} />
          )}
        </section>
      </main>
    </SetupFrame>
  );
}
