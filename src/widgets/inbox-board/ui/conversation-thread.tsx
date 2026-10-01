"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlarmClock, AlertCircle, Loader2, MessagesSquare, Phone, StickyNote } from "lucide-react";
import {
  channelLook,
  isSLABreached,
  unansweredAgeMinutes,
  type Conversation,
  type InboxMessage,
} from "@/entities/conversation";
import { cn } from "@/shared/lib/cn";
import { formatDateTime, formatDurationShort } from "@/shared/lib/format";
import { TONES } from "@/shared/ui";
import { ContactAvatar, contactName } from "./contact-avatar";

type Props = {
  conversation: Conversation;
  messages: InboxMessage[];
  loading: boolean;
  /** Composer, rendered under the messages when the viewer may reply. */
  composer?: ReactNode;
};

/** Header, message history and composer of the open conversation. */
export function ConversationThread({ conversation: c, messages, loading, composer }: Props) {
  const t = useTranslations("inbox");
  const locale = useLocale();
  const scrollRef = useRef<HTMLDivElement>(null);
  const name = contactName(c, t("unknown"));
  const look = channelLook(c.channel);
  const breached = isSLABreached(c);
  const waiting = c.unansweredSince ? formatDurationShort(unansweredAgeMinutes(c), locale) : null;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, c.id]);

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col" data-testid="inbox-thread" aria-label={name}>
      <header className="flex items-center gap-3 border-b border-zinc-100 px-5 py-3.5">
        <ContactAvatar conversation={c} label={name} />
        <div className="min-w-0 flex-1">
          <h2 dir="auto" className="truncate text-[15px] font-semibold tracking-tight text-zinc-950">
            {name}
          </h2>
          <p className="mt-0.5 flex min-w-0 items-center gap-2 text-[12px] font-medium text-zinc-500">
            <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold", TONES[look.tone].soft)}>
              {look.name}
            </span>
            {c.contactPhone ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <Phone className="h-3 w-3 shrink-0 text-zinc-400" strokeWidth={2.2} aria-hidden />
                <span dir="ltr" className="truncate tabular-nums">
                  {c.contactPhone}
                </span>
              </span>
            ) : null}
            {c.subject && c.subject !== name ? (
              <span dir="auto" className="truncate text-zinc-400">
                {c.subject}
              </span>
            ) : null}
          </p>
        </div>
        {waiting ? (
          <span
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold",
              breached ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-700",
            )}
            data-testid="inbox-thread-waiting"
          >
            <AlarmClock className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
            {breached ? t("slaBreached") : t("waiting", { time: waiting })}
          </span>
        ) : null}
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.04),transparent_60%)] px-5 py-5"
        data-testid="inbox-messages"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-zinc-100 text-zinc-400">
              <MessagesSquare className="h-5 w-5" aria-hidden />
            </span>
            <p className="text-xs font-medium text-zinc-500">{t("messagesEmpty")}</p>
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} locale={locale} />)
        )}
      </div>

      {composer}
    </section>
  );
}

function MessageBubble({ message: m, locale }: { message: InboxMessage; locale: string }) {
  const t = useTranslations("inbox");
  const out = m.direction === "out";
  const note = m.direction === "note";
  const failed = m.status === "failed";
  return (
    <div className={cn("flex", out || note ? "justify-end" : "justify-start")} data-testid="inbox-message" data-direction={m.direction}>
      <div className="max-w-[78%]">
        <div
          className={cn(
            "rounded-[20px] px-3.5 py-2.5 text-[13.5px] leading-[1.45]",
            m.direction === "in" && "rounded-es-md bg-white text-zinc-800 shadow-[0_0_0_1px_rgba(15,23,42,0.05),0_1px_2px_rgba(15,23,42,0.04)]",
            out && "rounded-ee-md bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-[0_10px_22px_-14px_rgba(14,165,233,0.8)]",
            note && "rounded-ee-md bg-amber-50 text-amber-950 ring-1 ring-inset ring-amber-200/70",
            failed && "ring-2 ring-rose-300",
          )}
        >
          {note ? (
            <span className="mb-1 flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-amber-700">
              <StickyNote className="h-3 w-3" strokeWidth={2.4} aria-hidden />
              {t("internalNote")}
            </span>
          ) : null}
          <p dir="auto" className="whitespace-pre-wrap break-words">
            {m.body}
          </p>
        </div>
        <p className={cn("mt-1 flex items-center gap-1 px-1.5 text-[10.5px] font-medium text-zinc-400", (out || note) && "justify-end")}>
          {failed ? (
            <span className="inline-flex items-center gap-1 text-rose-600" title={m.errorMessage || undefined}>
              <AlertCircle className="h-3 w-3" strokeWidth={2.4} aria-hidden />
              {t("messageFailed")}
            </span>
          ) : null}
          {m.authorName ? <span className="truncate">{m.authorName}</span> : null}
          {m.authorName ? <span aria-hidden>·</span> : null}
          <time dateTime={m.createdAt}>{formatDateTime(m.createdAt, locale)}</time>
        </p>
      </div>
    </div>
  );
}
