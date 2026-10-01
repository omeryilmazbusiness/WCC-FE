"use client";

import { useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { ArrowUp, Loader2, MessageSquareReply, Sparkles, StickyNote } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { SegmentedControl } from "@/shared/ui";

type Mode = "reply" | "note";

type Props = {
  sending: boolean;
  assisting: boolean;
  /** Resolves true when the message was stored, so the draft can be cleared. */
  onSend: (body: string, internalNote: boolean) => Promise<boolean>;
  /** Omit when the viewer has no AI access. Resolves with a reply draft or "". */
  onAssist?: () => Promise<string>;
  assistNote?: { summary: string; nextStep: string } | null;
};

/** Reply on the original channel or leave an internal note; ⌘/Ctrl+Enter sends. */
export function ReplyComposer({ sending, assisting, onSend, onAssist, assistNote }: Props) {
  const t = useTranslations("inbox");
  const [mode, setMode] = useState<Mode>("reply");
  const [draft, setDraft] = useState("");
  const note = mode === "note";
  const canSend = draft.trim().length > 0 && !sending;

  async function send() {
    if (!canSend) return;
    if (await onSend(draft.trim(), note)) setDraft("");
  }

  async function assist() {
    if (!onAssist) return;
    const text = await onAssist();
    if (text) {
      setMode("reply");
      setDraft(text);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="border-t border-zinc-100 px-4 pb-4 pt-3" data-testid="inbox-composer">
      {assistNote?.summary ? (
        <div className="mb-3 flex gap-2.5 rounded-[18px] bg-violet-50/80 px-3 py-2.5 ring-1 ring-inset ring-violet-100" data-testid="inbox-ai-summary">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-violet-100 text-violet-600">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 text-[12px] leading-5">
            <p dir="auto" className="font-semibold text-violet-950">
              {assistNote.summary}
            </p>
            {assistNote.nextStep ? (
              <p dir="auto" className="text-violet-800/80">
                {assistNote.nextStep}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mb-2.5 flex items-center gap-2">
        <SegmentedControl
          aria-label={t("composer.mode")}
          value={mode}
          onChange={setMode}
          className="rounded-[14px] border-0 bg-zinc-100/80 shadow-none"
          options={[
            { value: "reply", label: t("composer.reply"), icon: MessageSquareReply },
            { value: "note", label: t("composer.note"), icon: StickyNote },
          ]}
        />
        {onAssist ? (
          <button
            type="button"
            onClick={() => void assist()}
            disabled={assisting}
            className="ms-auto inline-flex h-9 items-center gap-1.5 rounded-[12px] bg-violet-50 px-3 text-[12px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-100 transition-colors hover:bg-violet-100 disabled:opacity-60"
            data-testid="inbox-ai-assist"
          >
            {assisting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            {t("aiAssist")}
          </button>
        ) : null}
      </div>

      <div
        className={cn(
          "flex items-end gap-2 rounded-[22px] p-1.5 ps-4 ring-1 ring-inset transition-[box-shadow,background-color] focus-within:ring-2",
          note ? "bg-amber-50/70 ring-amber-200 focus-within:ring-amber-300" : "bg-zinc-50 ring-zinc-200/80 focus-within:bg-white focus-within:ring-sky-200",
        )}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          dir="auto"
          aria-label={note ? t("notePlaceholder") : t("replyPlaceholder")}
          placeholder={note ? t("notePlaceholder") : t("replyPlaceholder")}
          className="max-h-40 min-h-[2.75rem] flex-1 resize-none bg-transparent py-2 text-[13.5px] leading-5 text-zinc-900 outline-none placeholder:text-zinc-400"
          data-testid="inbox-draft"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={!canSend}
          aria-label={note ? t("saveNote") : t("send")}
          title={`${note ? t("saveNote") : t("send")} · ${t("composer.shortcut")}`}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-[background-color,transform,opacity] active:scale-95 disabled:opacity-40",
            note ? "bg-amber-500 hover:bg-amber-600" : "bg-gradient-to-br from-sky-500 to-blue-600 hover:brightness-110",
          )}
          data-testid="inbox-send"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden />}
        </button>
      </div>
    </div>
  );
}
