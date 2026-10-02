"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/shared/lib/cn";
import { useTypewriter } from "@/shared/lib/use-typewriter";

export type GlassWord = { text: string; lang: string; dir: "ltr" | "rtl" };

type Props = {
  words: readonly GlassWord[];
  className?: string;
  /** Freezes the cycle, e.g. while the visitor is about to act on the current word. */
  paused?: boolean;
  /** Index of the word being typed, held or erased. */
  onWordChange?: (index: number) => void;
};

/**
 * Apple-style greeting: each word is typed in frosted "liquid glass" lettering, held,
 * erased, and followed by the next. Screen readers get every word once, statically.
 */
export function LiquidGlassTypewriter({ words, className, paused = false, onWordChange }: Props) {
  const reduceMotion = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const { text, word, phase } = useTypewriter(
    words.map((w) => w.text),
    { instant: reduceMotion, enabled: visible && !paused },
  );
  const current = words[word];
  useEffect(() => {
    onWordChange?.(word);
  }, [word, onWordChange]);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("relative flex items-center justify-center", className)}>
      <span className="sr-only">{words.map((w) => w.text).join(" · ")}</span>
      <span
        aria-hidden
        lang={current?.lang}
        dir={current?.dir}
        data-testid="glass-greeting"
        data-word={word}
        data-phase={phase}
        className={cn(
          "liquid-glass-text inline-flex min-h-[1.2em] items-center whitespace-nowrap leading-[1.15]",
          current?.dir === "rtl" ? "font-semibold tracking-normal" : "font-semibold tracking-[-0.045em]",
        )}
      >
        {text}
        <span className="liquid-glass-caret ms-[0.06em] inline-block h-[0.82em] w-[0.06em] rounded-full" />
      </span>
    </div>
  );
}
