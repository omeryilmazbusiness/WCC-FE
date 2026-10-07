"use client";

import { useState } from "react";
import { AlertCircle, Check, Copy, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ChatFeedback, ChatMessage } from "@/entities/assistant";
import { cn } from "@/shared/lib/cn";
import { AssistantOrb } from "./assistant-orb";
import { ReplyMetaLine } from "./reply-meta";
import { RichText } from "./rich-text";

type Props = {
  message: ChatMessage;
  isLast: boolean;
  onRetry: (id: string) => void;
  onFeedback: (id: string, value: ChatFeedback | undefined) => void;
};

/** iMessage-style user bubble, or an assistant reply with copy / retry / feedback. */
export function MessageItem({ message, isLast, onRetry, onFeedback }: Props) {
  if (message.role === "user") {
    return (
      <div className="animate-assistant-pop flex justify-end" data-testid="assistant-msg-user">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-[20px] rounded-ee-[6px] bg-[#007AFF] px-3.5 py-2 text-[14.5px] leading-relaxed text-white shadow-[0_6px_16px_-10px_rgba(0,122,255,0.8)]">
          {message.content}
        </p>
      </div>
    );
  }
  return <AssistantReply message={message} isLast={isLast} onRetry={onRetry} onFeedback={onFeedback} />;
}

function AssistantReply({ message, isLast, onRetry, onFeedback }: Props) {
  const t = useTranslations("assistant");
  const [copied, setCopied] = useState(false);
  const waiting = message.status === "streaming" && message.content === "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; nothing else to do.
    }
  }

  return (
    <div className="animate-assistant-pop group flex gap-2.5" data-testid="assistant-msg-assistant" data-status={message.status}>
      <AssistantOrb size="xs" still={message.status !== "streaming"} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        {waiting ? (
          <TypingDots label={t("thinking")} />
        ) : message.status === "error" ? (
          <div className="flex items-start gap-2 rounded-2xl bg-rose-50 px-3 py-2.5 text-[13.5px] text-rose-700" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1">{t(`errors.${errorKey(message.errorCode)}`)}</span>
          </div>
        ) : (
          <RichText text={message.content} caret={message.status === "streaming"} />
        )}
        {message.meta && message.status !== "error" && !waiting ? (
          <ReplyMetaLine
            meta={message.meta}
            onAskAI={message.meta.source === "faq" && isLast && message.status === "done" ? () => onRetry(message.id) : undefined}
          />
        ) : null}
        {message.status === "stopped" ? <p className="mt-1.5 text-[12px] font-medium text-zinc-400">{t("stopped")}</p> : null}

        {message.status !== "streaming" ? (
          <div
            className={cn(
              "mt-1.5 flex items-center gap-0.5 transition-opacity",
              isLast ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
            )}
          >
            {message.content ? (
              <Action label={copied ? t("copied") : t("copy")} onClick={() => void copy()}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Action>
            ) : null}
            {isLast ? (
              <Action label={t("retry")} onClick={() => onRetry(message.id)} testId="assistant-retry">
                <RotateCcw className="h-3.5 w-3.5" />
              </Action>
            ) : null}
            {message.status === "done" ? (
              <>
                <Action
                  label={t("helpful")}
                  pressed={message.feedback === "up"}
                  onClick={() => onFeedback(message.id, message.feedback === "up" ? undefined : "up")}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </Action>
                <Action
                  label={t("notHelpful")}
                  pressed={message.feedback === "down"}
                  onClick={() => onFeedback(message.id, message.feedback === "down" ? undefined : "down")}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </Action>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const ERROR_KEYS: Record<string, string> = {
  not_configured: "notConfigured",
  forbidden: "forbidden",
  rate_limited: "rateLimited",
  invalid: "invalid",
  offline: "offline",
};

function errorKey(code: string | undefined): string {
  return (code && ERROR_KEYS[code]) || "unavailable";
}

function Action({ label, onClick, pressed, testId, children }: { label: string; onClick: () => void; pressed?: boolean; testId?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      data-testid={testId}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
        pressed ? "bg-indigo-50 text-indigo-600" : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700",
      )}
    >
      {children}
    </button>
  );
}

function TypingDots({ label }: { label: string }) {
  return (
    <span role="status" aria-label={label} className="inline-flex h-7 items-center gap-1 rounded-full bg-zinc-100 px-3">
      {[0, 160, 320].map((delay) => (
        <span key={delay} className="animate-assistant-dot h-1.5 w-1.5 rounded-full bg-zinc-500" style={{ animationDelay: `${delay}ms` }} />
      ))}
    </span>
  );
}
