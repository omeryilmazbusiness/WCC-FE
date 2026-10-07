"use client";

import { useMemo } from "react";
import { createLiveTransport, createPreviewTransport, type AssistantTransport } from "@/entities/assistant";
import { useFaqCatalog } from "@/entities/faq";
import { usePermissions, useViewer } from "@/entities/viewer";
import { createFaqIndex, withFaqFirst } from "./faq-first";

/**
 * The shell's chat transport: Help & FAQ first (in the viewer's language and
 * permissions), then the backend assistant, or the offline preview in demo sessions.
 */
export function useAssistantTransport(): AssistantTransport {
  const demo = Boolean(useViewer().demo);
  const topics = useFaqCatalog(usePermissions());
  const lookup = useMemo(() => createFaqIndex(topics.flatMap((t) => t.entries)), [topics]);
  return useMemo(() => withFaqFirst(demo ? createPreviewTransport() : createLiveTransport(), lookup), [demo, lookup]);
}
