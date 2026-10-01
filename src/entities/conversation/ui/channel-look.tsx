import { FlaskConical, Mail } from "lucide-react";
import type { Tone } from "@/shared/ui";
import type { InboxChannel } from "../model";

type GlyphProps = { className?: string };

function WhatsAppGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12.04 2.5a9.42 9.42 0 0 0-8.1 14.23L2.5 21.5l4.9-1.4A9.43 9.43 0 1 0 12.04 2.5Zm0 17.2a7.8 7.8 0 0 1-3.97-1.09l-.28-.17-2.9.83.85-2.82-.19-.3a7.8 7.8 0 1 1 6.49 3.55Zm4.28-5.84c-.23-.12-1.38-.68-1.6-.76-.21-.08-.37-.12-.52.12-.16.23-.6.76-.74.91-.14.16-.27.18-.5.06a6.4 6.4 0 0 1-1.88-1.16 7.06 7.06 0 0 1-1.3-1.62c-.14-.23 0-.36.1-.48.11-.1.24-.27.35-.4.12-.14.16-.24.24-.39.08-.16.04-.3-.02-.41-.06-.12-.52-1.26-.72-1.72-.19-.45-.38-.39-.52-.4h-.45a.86.86 0 0 0-.62.3 2.6 2.6 0 0 0-.82 1.94 4.53 4.53 0 0 0 .95 2.4c.12.15 1.64 2.5 3.97 3.5.55.24.99.38 1.32.49.56.18 1.07.15 1.47.09.45-.07 1.38-.56 1.57-1.11.2-.55.2-1.02.14-1.11-.06-.1-.21-.16-.44-.27Z" />
    </svg>
  );
}

function InstagramGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="12" cy="12" r="3.9" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
    </svg>
  );
}

function MessengerGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2.5c-5.35 0-9.5 3.92-9.5 9.21 0 2.77 1.14 5.16 2.99 6.81.16.14.25.33.26.54l.05 1.69a.76.76 0 0 0 1.07.67l1.89-.83c.16-.07.34-.08.51-.04.87.24 1.79.37 2.73.37 5.35 0 9.5-3.92 9.5-9.21S17.35 2.5 12 2.5Zm5.7 7.09-2.79 4.43a1.43 1.43 0 0 1-2.06.38l-2.22-1.66a.57.57 0 0 0-.69 0l-3 2.27c-.4.3-.92-.17-.65-.6l2.79-4.43a1.43 1.43 0 0 1 2.06-.38l2.22 1.66c.2.15.48.15.69 0l3-2.27c.4-.3.92.17.65.6Z" />
    </svg>
  );
}

function GmailGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M3.5 7.2v10.3c0 .83.67 1.5 1.5 1.5h2.2v-8.1L12 14.5l4.8-3.6V19H19c.83 0 1.5-.67 1.5-1.5V7.2a1.7 1.7 0 0 0-2.72-1.36L12 10.1 6.22 5.84A1.7 1.7 0 0 0 3.5 7.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EmailGlyph({ className }: GlyphProps) {
  return <Mail className={className} strokeWidth={2} aria-hidden />;
}

function StubGlyph({ className }: GlyphProps) {
  return <FlaskConical className={className} strokeWidth={2} aria-hidden />;
}

export type ChannelLook = {
  glyph: (props: GlyphProps) => React.ReactElement;
  tone: Tone;
  /** Brand name; not translated. */
  name: string;
};

export const CHANNEL_LOOK: Record<InboxChannel, ChannelLook> = {
  whatsapp: { glyph: WhatsAppGlyph, tone: "emerald", name: "WhatsApp" },
  instagram: { glyph: InstagramGlyph, tone: "rose", name: "Instagram" },
  facebook: { glyph: MessengerGlyph, tone: "sky", name: "Messenger" },
  gmail: { glyph: GmailGlyph, tone: "amber", name: "Gmail" },
  email: { glyph: EmailGlyph, tone: "violet", name: "Email" },
  stub: { glyph: StubGlyph, tone: "zinc", name: "Test" },
};

/** Look for any channel string the API may send; unknown values fall back to the test look. */
export function channelLook(channel: string): ChannelLook {
  return CHANNEL_LOOK[channel as InboxChannel] ?? CHANNEL_LOOK.stub;
}
