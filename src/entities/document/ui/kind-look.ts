import { BookUser, Camera, FileQuestion, ReceiptText, Stamp, type LucideIcon } from "lucide-react";
import type { Tone } from "@/shared/ui";

export type DocumentKindLook = { icon: LucideIcon; tone: Tone };

const LOOKS: Record<string, DocumentKindLook> = {
  passport: { icon: BookUser, tone: "sky" },
  visa: { icon: Stamp, tone: "violet" },
  photo: { icon: Camera, tone: "amber" },
  receipt: { icon: ReceiptText, tone: "emerald" },
};
const FALLBACK: DocumentKindLook = { icon: FileQuestion, tone: "zinc" };

/** Icon and colour per document kind, shared by every documents screen. */
export function documentKindLook(kind: string): DocumentKindLook {
  return LOOKS[kind] ?? FALLBACK;
}
