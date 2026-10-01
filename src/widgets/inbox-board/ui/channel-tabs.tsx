"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Inbox } from "lucide-react";
import { channelLook, type ChannelCounts, type InboxChannel } from "@/entities/conversation";
import { cn } from "@/shared/lib/cn";
import { TONES, type Tone } from "@/shared/ui";

type Props = {
  channels: InboxChannel[];
  value: InboxChannel | "all";
  counts: ChannelCounts | null;
  onChange: (value: InboxChannel | "all") => void;
};

/** Channel switcher above the conversations: one tab per live channel, with open counts. */
export function ChannelTabs({ channels, value, counts, onChange }: Props) {
  const t = useTranslations("inbox");
  const locale = useLocale();
  const listRef = useRef<HTMLDivElement>(null);
  const options: (InboxChannel | "all")[] = ["all", ...channels];

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const i = options.indexOf(value);
    const step = (e.key === "ArrowRight") !== rtl ? 1 : -1;
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? options.length - 1 : (i + step + options.length) % options.length;
    onChange(options[next]);
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  const count = (n: number | undefined) => (n == null ? null : n.toLocaleString(locale));

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={t("tabs.label")}
      onKeyDown={onKeyDown}
      className="@container flex gap-1.5 overflow-x-auto rounded-[22px] bg-zinc-100/70 p-1.5 [scrollbar-width:none]"
      data-testid="inbox-channel-tabs"
    >
      <Tab
        id="all"
        active={value === "all"}
        onSelect={() => onChange("all")}
        tone="indigo"
        icon={<Inbox className="h-[18px] w-[18px]" strokeWidth={2.1} />}
        label={t("tabs.all")}
        count={count(counts?.total)}
      />
      {channels.map((channel) => {
        const look = channelLook(channel);
        const Glyph = look.glyph;
        return (
          <Tab
            key={channel}
            id={channel}
            active={value === channel}
            onSelect={() => onChange(channel)}
            tone={look.tone}
            icon={<Glyph className="h-[18px] w-[18px]" />}
            label={look.name}
            count={count(counts?.channels[channel] ?? (counts ? 0 : undefined))}
          />
        );
      })}
    </div>
  );
}

function Tab({
  id,
  active,
  onSelect,
  tone,
  icon,
  label,
  count,
}: {
  id: string;
  active: boolean;
  onSelect: () => void;
  tone: Tone;
  icon: ReactNode;
  label: string;
  count: string | null;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      aria-label={label}
      title={label}
      onClick={onSelect}
      data-testid={`inbox-channel-tab-${id}`}
      className={cn(
        "flex h-12 shrink-0 items-center gap-2.5 rounded-[16px] pe-3 ps-1.5 text-[13px] font-semibold transition-[background-color,box-shadow,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/15",
        active
          ? "bg-white text-zinc-950 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_20px_-14px_rgba(15,23,42,0.4)]"
          : "text-zinc-500 hover:bg-white/60 hover:text-zinc-800",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-[12px] transition-colors duration-200",
          active ? TONES[tone].gradient : TONES[tone].soft,
        )}
        aria-hidden
      >
        {icon}
      </span>
      {/* Narrow bars keep only the brand mark on inactive tabs; the active tab always names itself. */}
      <span className={cn("whitespace-nowrap", !active && "hidden @[54rem]:inline")} aria-hidden>
        {label}
      </span>
      {count != null ? (
        <span
          className={cn(
            "min-w-6 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums",
            active ? "bg-zinc-950 text-white" : "bg-zinc-200/70 text-zinc-600",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
