"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { createSetupRepository, type SetupOverview, type SetupStepKey } from "@/entities/setup";
import { useRouter } from "@/shared/i18n/navigation";
import { isRtl } from "@/shared/i18n/routing";
import { routes } from "@/shared/config/routes";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { ErrorState, useMutationFeedback } from "@/shared/ui";
import { initialStep, neighborStep, statusOf, stepOrder } from "../model/flow";
import { clearSetupIntroCookie } from "../model/intro";
import { AIStep } from "./ai-step";
import { ChannelsStep } from "./channels-step";
import { CompanyStep } from "./company-step";
import { PillButton } from "./glass";
import { SetupDone } from "./setup-done";
import { SetupIntro } from "./setup-intro";
import { StaffStep } from "./staff-step";
import { StepDock } from "./step-dock";

type Props = {
  /** Server-rendered overview; the screen fetches itself when it is missing. */
  initial: SetupOverview | null;
  /** Welcome + language choice before the steps; off only right after a language switch. */
  showIntro?: boolean;
};

export function SetupScreen({ initial, showIntro = false }: Props) {
  const t = useTranslations("setup");
  const repository = useMemo(() => createSetupRepository(), []);
  const query = useApiQuery(() => repository.get(), [repository], { enabled: initial === null });
  const [intro, setIntro] = useState(showIntro);

  useEffect(() => {
    document.cookie = clearSetupIntroCookie();
  }, []);

  function introDone() {
    window.scrollTo({ top: 0 });
    setIntro(false);
  }

  const overview = initial ?? query.data;
  return (
    <SetupFrame>
      {intro ? (
        <SetupIntro onDone={introDone} />
      ) : (
        <div key="flow" className="animate-setup-stage-in">
          {overview ? (
            <SetupFlow initial={overview} />
          ) : (
            <div className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-5">
              {query.error ? (
                <ErrorState className="w-full" title={t("loadError")} onRetry={() => void query.reload()} />
              ) : (
                <span role="status" className="flex items-center gap-3 text-[13px] font-medium text-white/60">
                  <span
                    aria-hidden
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent motion-reduce:animate-none"
                  />
                  {t("loading")}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </SetupFrame>
  );
}

/** One night-aurora wallpaper behind the welcome and every step, so stages blend into each other. */
function SetupFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="night-glass relative isolate min-h-dvh bg-[#050816] text-white">
      <div aria-hidden className="night-aurora fixed inset-0 -z-10" />
      {children}
    </div>
  );
}

/** iOS-style push: the next card slides in from the reading direction and the previous one recedes. */
const CARD_MOTION: Variants = {
  enter: ({ dir, still }: Slide) => (still ? { opacity: 0 } : { opacity: 0, x: dir * 56, scale: 0.97, filter: "blur(10px)" }),
  center: { opacity: 1, x: 0, scale: 1, filter: "blur(0px)" },
  exit: ({ dir, still }: Slide) => (still ? { opacity: 0 } : { opacity: 0, x: dir * -56, scale: 0.97, filter: "blur(10px)" }),
};

type Slide = { dir: number; still: boolean };

function SetupFlow({ initial }: { initial: SetupOverview }) {
  const t = useTranslations("setup");
  const router = useRouter();
  const feedback = useMutationFeedback();
  const repository = useMemo(() => createSetupRepository(), []);
  const [overview, setOverview] = useState(initial);
  const [step, setStepState] = useState<SetupStepKey | null>(() => initialStep(initial));
  const [forward, setForward] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const still = useReducedMotion() ?? false;
  const rtl = isRtl(useLocale());

  const indexOf = useCallback(
    (key: SetupStepKey | null, of: SetupOverview) => (key ? stepOrder(of).indexOf(key) : of.totalSteps),
    [],
  );

  /** Opens a step (null = summary), remembering which way to slide. */
  const setStep = useCallback(
    (next: SetupStepKey | null, of: SetupOverview = overview) => {
      setForward(indexOf(next, of) >= indexOf(step, of));
      setStepState(next);
    },
    [indexOf, overview, step],
  );

  const locked = useCallback(
    (key: SetupStepKey) => key !== "company" && statusOf(overview, "company") === "pending",
    [overview],
  );

  const back = step ? neighborStep(overview, step, -1) : null;
  const goBack = back ? () => setStep(back) : null;

  /** Saves progress and opens the following step, or the summary after the last one. */
  function advanced(next: SetupOverview, from: SetupStepKey) {
    setOverview(next);
    setStep(next.completed ? null : neighborStep(next, from, 1), next);
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
  const slide: Slide = { dir: (forward ? 1 : -1) * (rtl ? -1 : 1), still };

  return (
    <>
      <header className="mx-auto flex max-w-5xl items-center justify-end px-5 pt-5 sm:px-8 sm:pt-7">
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
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/55">
            {step ? t("eyebrow", { current: position, total: overview.totalSteps }) : t("eyebrowDone")}
          </p>
          <h1 className="liquid-glass-text text-[34px] font-semibold leading-[1.15] tracking-[-0.035em] sm:text-[44px]">
            {t("title")}
          </h1>
        </div>

        <StepDock steps={overview.steps} active={step} onSelect={setStep} locked={locked} />

        <AnimatePresence mode="wait" initial={false} custom={slide}>
          <motion.section
            key={step ?? "done"}
            custom={slide}
            variants={CARD_MOTION}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: still ? 0.15 : 0.42, ease: [0.32, 0.72, 0, 1] }}
            className="liquid-glass mt-10 w-full max-w-[600px] rounded-[32px] p-5 sm:p-8"
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
          </motion.section>
        </AnimatePresence>
      </main>
    </>
  );
}
