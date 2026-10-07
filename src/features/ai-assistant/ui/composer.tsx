"use client";

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { ArrowUp, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import { MAX_PROMPT_CHARS } from "@/entities/assistant";
import { cn } from "@/shared/lib/cn";

export type ComposerHandle = { focus: () => void };

type Props = {
  /** Draft text, owned by the caller so each conversation keeps its own. */
  value: string;
  onValueChange: (value: string) => void;
  streaming: boolean;
  onSend: (text: string) => boolean;
  onStop: () => void;
  /** Where the question is asked from, shown as a chip, e.g. "Manager dashboard". */
  contextLabel?: string;
};

const MAX_HEIGHT = 160;

/** Auto-growing prompt box: Enter sends, Shift+Enter adds a line, Stop while answering. */
export const Composer = forwardRef<ComposerHandle, Props>(({ value: text, onValueChange: setText, streaming, onSend, onStop, contextLabel }, ref) => {
  const t = useTranslations("assistant");
  const area = useRef<HTMLTextAreaElement>(null);
  const over = text.length > MAX_PROMPT_CHARS;
  const ready = text.trim().length > 0 && !over && !streaming;

  useImperativeHandle(ref, () => ({ focus: () => area.current?.focus() }), []);

  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [text]);

  function submit() {
    if (!ready) return;
    if (onSend(text)) setText("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="rounded-[24px] bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_12px_32px_-18px_rgba(15,23,42,0.35)] ring-1 ring-zinc-950/[0.07] transition focus-within:ring-indigo-300">
      {contextLabel ? (
        <div className="px-2 pb-1 pt-0.5">
          <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11.5px] font-medium text-zinc-600" data-testid="assistant-context">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            {contextLabel}
          </span>
        </div>
      ) : null}
      <div className="flex items-end gap-2">
        <textarea
          ref={area}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          aria-invalid={over}
          className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[14.5px] leading-6 text-zinc-950 outline-none placeholder:text-zinc-400"
          data-testid="assistant-input"
        />
        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label={t("stop")}
            title={t("stop")}
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition hover:bg-zinc-700"
            data-testid="assistant-stop"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!ready}
            aria-label={t("send")}
            title={t("send")}
            className={cn(
              "mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition",
              ready ? "bg-[#007AFF] text-white shadow-[0_6px_16px_-8px_rgba(0,122,255,0.9)] hover:bg-[#0066d6]" : "bg-zinc-200 text-zinc-400",
            )}
            data-testid="assistant-send"
          >
            <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.6} />
          </button>
        )}
      </div>
      {over ? (
        <p className="px-2 pt-1 text-[11.5px] font-medium text-rose-600" role="alert">
          {t("tooLong", { max: MAX_PROMPT_CHARS })}
        </p>
      ) : null}
    </div>
  );
});
Composer.displayName = "Composer";
