import { channelLook, type Conversation } from "@/entities/conversation";
import { initials } from "@/shared/lib/avatar";
import { cn } from "@/shared/lib/cn";
import { TONES } from "@/shared/ui";

const SIZES = {
  md: { box: "h-11 w-11 text-[13px]", badge: "h-5 w-5 -bottom-0.5 -end-0.5", glyph: "h-3 w-3" },
  lg: { box: "h-16 w-16 text-lg", badge: "h-7 w-7 -bottom-1 -end-1", glyph: "h-4 w-4" },
} as const;

export function contactName(c: Conversation, fallback: string): string {
  return c.contactName || c.customerName || c.identityLabel || c.subject || fallback;
}

/** Contact initials in the channel tint, with the channel mark on the corner. */
export function ContactAvatar({ conversation, size = "md", label }: { conversation: Conversation; size?: keyof typeof SIZES; label: string }) {
  const look = channelLook(conversation.channel);
  const Glyph = look.glyph;
  const s = SIZES[size];
  return (
    <span className="relative inline-flex shrink-0" aria-hidden>
      <span className={cn("flex items-center justify-center rounded-full font-semibold tracking-wide", s.box, TONES[look.tone].soft)}>
        {initials(label)}
      </span>
      <span className={cn("absolute flex items-center justify-center rounded-full ring-2 ring-white", s.badge, TONES[look.tone].solid)}>
        <Glyph className={s.glyph} />
      </span>
    </span>
  );
}
