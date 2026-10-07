"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, ChevronDown } from "lucide-react";
import { createUiPreferenceRepository } from "@/entities/ui-preference";
import { useViewer } from "@/entities/viewer";
import { usePathname, useRouter } from "@/shared/i18n/navigation";
import type { AppLocale } from "@/shared/i18n/routing";
import { cn } from "@/shared/lib/cn";
import { LiquidGlassTypewriter, ScrollFlyIn, type GlassWord } from "@/shared/ui";
import { setupIntroCookie } from "../model/intro";

type Greeting = GlassWord & { lang: AppLocale; cta: string; hint: string };

/** Written in its own script: the visitor has not picked a language yet. */
const GREETINGS: readonly Greeting[] = [
  { text: "Welcome", lang: "en", dir: "ltr", cta: "Continue", hint: "Set up in English" },
  { text: "أهلاً وسهلاً", lang: "ar", dir: "rtl", cta: "متابعة", hint: "الإعداد باللغة العربية" },
];

const JET = { src: "/setup/private-jet.webp", width: 2000, height: 1157 };

/** Matches the `duration-500` fade below, so the steps rise only once the welcome is gone. */
const FADE_OUT_MS = 480;

type Props = {
  /** The visitor kept the current language: show the steps in place. */
  onDone: () => void;
};

/**
 * Setup welcome, shown on every visit: a fly-in hero, then a greeting that cycles through the supported
 * languages. "Continue" picks whichever language is on screen at that moment.
 */
export function SetupIntro({ onDone }: Props) {
  const t = useTranslations("setup.intro");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useViewer();
  const preferences = useMemo(() => createUiPreferenceRepository(), []);
  const languageRef = useRef<HTMLElement>(null);
  const [word, setWord] = useState(0);
  const [holding, setHolding] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [atLanguage, setAtLanguage] = useState(false);
  const [, startSwitch] = useTransition();
  const current = GREETINGS[word] ?? GREETINGS[0];

  useEffect(() => {
    const el = languageRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setAtLanguage(entry.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function proceed() {
    if (leaving) return;
    const next = current.lang;
    setLeaving(true);
    const saved = preferences.markWelcomeSeen().catch(() => undefined);
    if (next === locale) {
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.setTimeout(onDone, still ? 0 : FADE_OUT_MS);
      return;
    }
    // The next locale is server-rendered; the cookie makes it open on the steps, not the intro again.
    document.cookie = setupIntroCookie(user.id);
    void saved.then(() => startSwitch(() => router.replace(pathname, { locale: next, scroll: true })));
  }

  return (
    <div
      data-testid="setup-intro"
      data-leaving={leaving || undefined}
      className={cn(
        "transition-[opacity,filter,transform] duration-500 ease-out motion-reduce:transition-opacity",
        leaving && "pointer-events-none scale-[1.03] opacity-0 blur-md",
      )}
    >
      <ScrollFlyIn imageUrl={JET.src} imageWidth={JET.width} imageHeight={JET.height} data-testid="setup-intro-hero">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/55 sm:text-[13px]">
            {t("eyebrow")}
          </p>
          <h1 className="liquid-glass-text mt-3 text-balance text-[44px] font-semibold leading-[1.08] tracking-[-0.045em] sm:text-6xl md:text-7xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-[15px] leading-relaxed text-white/60 sm:text-[17px]">
            {t("subtitle")}
          </p>
        </div>
      </ScrollFlyIn>

      <button
        type="button"
        onClick={() => languageRef.current?.scrollIntoView({ behavior: "smooth" })}
        tabIndex={atLanguage ? -1 : undefined}
        aria-hidden={atLanguage || undefined}
        className={cn(
          "glass-pill fixed bottom-6 left-1/2 z-30 flex h-10 -translate-x-1/2 items-center gap-2 rounded-full ps-4 pe-3 text-[13px] font-semibold text-white/90 transition-[opacity,translate,background-color] duration-300 hover:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70",
          atLanguage && "pointer-events-none translate-y-3 opacity-0",
        )}
        data-testid="setup-intro-scroll"
      >
        {t("scrollHint")}
        <ChevronDown className="h-4 w-4 animate-bounce motion-reduce:animate-none" strokeWidth={2.2} aria-hidden />
      </button>

      <section
        ref={languageRef}
        aria-label={GREETINGS.map((g) => g.hint).join(" / ")}
        className="relative z-40 flex min-h-dvh flex-col items-center justify-center gap-14 overflow-hidden px-6 py-20 text-center"
        data-testid="setup-language"
      >
        <LiquidGlassTypewriter
          words={GREETINGS}
          paused={holding || leaving}
          onWordChange={setWord}
          className="text-[clamp(64px,13vw,176px)]"
        />

        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            lang={current.lang}
            dir={current.dir}
            onClick={proceed}
            onPointerEnter={() => setHolding(true)}
            onPointerLeave={() => setHolding(false)}
            onFocus={() => setHolding(true)}
            onBlur={() => setHolding(false)}
            disabled={leaving}
            aria-label={current.hint}
            aria-busy={leaving || undefined}
            data-testid="setup-continue"
            data-lang={current.lang}
            className={cn(
              "group relative flex h-14 min-w-[220px] items-center justify-center gap-2.5 overflow-hidden rounded-full border border-white/20 bg-white/[0.12] px-8 text-[17px] font-semibold tracking-[-0.01em] text-white backdrop-blur-2xl transition-all duration-300",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_24px_48px_-24px_rgba(56,189,248,0.55)]",
              "hover:border-white/35 hover:bg-white/[0.18] active:scale-[0.97] disabled:opacity-70",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816]",
            )}
          >
            <span key={current.lang} className="animate-setup-in flex items-center gap-2.5">
              {current.cta}
              {leaving ? (
                <span
                  aria-hidden
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent motion-reduce:animate-none"
                />
              ) : (
                <ArrowRight
                  className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                  strokeWidth={2.2}
                  aria-hidden
                />
              )}
            </span>
          </button>
          <p
            key={current.lang}
            lang={current.lang}
            dir={current.dir}
            className="animate-setup-in text-[13px] font-medium text-white/50"
            aria-hidden
          >
            {current.hint}
          </p>
        </div>
      </section>
    </div>
  );
}
