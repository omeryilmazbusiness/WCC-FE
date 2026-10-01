"use client";

import { useLocale, useTranslations } from "next-intl";
import { AlarmClock, Inbox, UserRound } from "lucide-react";
import { isSLABreached, unansweredAgeMinutes, type Conversation } from "@/entities/conversation";
import { initials } from "@/shared/lib/avatar";
import { cn } from "@/shared/lib/cn";
import { formatDurationShort, formatRelativeTime } from "@/shared/lib/format";
import { ContactAvatar, contactName } from "./contact-avatar";

type Props = {
  rows: Conversation[];
  selectedId: string | null;
  currentUserId: string;
  loading: boolean;
  onSelect: (id: string) => void;
};

/** Open threads, most urgent first, as the API orders them. */
export function ConversationList({ rows, selectedId, currentUserId, loading, onSelect }: Props) {
  const t = useTranslations("inbox");
  if (rows.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center" data-testid="inbox-list-empty">
        <span className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-sky-50 text-sky-600">
          <Inbox className="h-6 w-6" strokeWidth={2} aria-hidden />
        </span>
        <p className="text-sm font-semibold text-zinc-800">{t("empty")}</p>
        <p className="text-xs leading-5 text-zinc-500">{t("emptyHint")}</p>
      </div>
    );
  }
  return (
    <ul className={cn("flex flex-col gap-1 p-2 transition-opacity", loading && "opacity-60")} aria-busy={loading}>
      {rows.map((c) => (
        <li key={c.id}>
          <ConversationRow
            conversation={c}
            selected={c.id === selectedId}
            mine={c.ownerId === currentUserId}
            onSelect={() => onSelect(c.id)}
          />
        </li>
      ))}
    </ul>
  );
}

function ConversationRow({
  conversation: c,
  selected,
  mine,
  onSelect,
}: {
  conversation: Conversation;
  selected: boolean;
  mine: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations("inbox");
  const locale = useLocale();
  const name = contactName(c, t("unknown"));
  const breached = isSLABreached(c);
  const waiting = c.unansweredSince ? formatDurationShort(unansweredAgeMinutes(c), locale) : null;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      data-testid="inbox-row"
      className={cn(
        "flex w-full items-start gap-3 rounded-[18px] px-2.5 py-2.5 text-start transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10",
        selected ? "bg-sky-50/90 ring-1 ring-inset ring-sky-100" : "hover:bg-zinc-50",
      )}
    >
      <ContactAvatar conversation={c} label={name} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span dir="auto" className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-zinc-900">
            {name}
          </span>
          <time dateTime={c.updatedAt} className="shrink-0 text-[11px] font-medium text-zinc-400">
            {formatRelativeTime(c.updatedAt, locale)}
          </time>
        </span>
        <span dir="auto" className="mt-0.5 block truncate text-[12.5px] text-zinc-500">
          {c.lastMessagePreview || c.subject || t("noPreview")}
        </span>
        <span className="mt-1.5 flex items-center gap-1.5">
          {waiting ? (
            <span
              className={cn(
                "inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[10.5px] font-semibold",
                breached ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-700",
              )}
              title={breached ? t("slaBreached") : t("waiting", { time: waiting })}
            >
              <AlarmClock className="h-3 w-3" strokeWidth={2.4} aria-hidden />
              {waiting}
            </span>
          ) : null}
          <span className="ms-auto inline-flex items-center gap-1 text-[10.5px] font-medium text-zinc-400" title={c.ownerName || t("unassigned")}>
            {c.ownerId ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-[9px] font-bold text-zinc-600">
                {initials(c.ownerName)}
              </span>
            ) : (
              <UserRound className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            )}
            <span className="max-w-[7rem] truncate">{mine ? t("you") : c.ownerName || t("unassigned")}</span>
          </span>
        </span>
      </span>
    </button>
  );
}
