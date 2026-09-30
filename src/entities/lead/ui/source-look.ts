import {
  Camera,
  Globe,
  Handshake,
  Mail,
  Megaphone,
  MessageCircle,
  PhoneCall,
  Share2,
  Store,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/shared/ui";
import type { LeadSourceKind } from "../lib/source";

export type SourceLook = { icon: LucideIcon; tone: Tone };

/** Icon and color per lead channel. */
export const LEAD_SOURCE_LOOK: Record<LeadSourceKind, SourceLook> = {
  whatsapp: { icon: MessageCircle, tone: "emerald" },
  instagram: { icon: Camera, tone: "rose" },
  facebook: { icon: Share2, tone: "indigo" },
  web: { icon: Globe, tone: "sky" },
  email: { icon: Mail, tone: "violet" },
  phone: { icon: PhoneCall, tone: "teal" },
  referral: { icon: Handshake, tone: "amber" },
  walkin: { icon: Store, tone: "zinc" },
  other: { icon: Megaphone, tone: "zinc" },
};
