"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { FaqTopic, FaqTopicId } from "./catalog";
import { visibleFaqTopics, type FaqEntry } from "./search";

export type FaqTopicView = {
  id: FaqTopicId;
  route?: FaqTopic["route"];
  title: string;
  summary: string;
  entries: FaqEntry[];
};

/** Topics the viewer may read (by their `granted` permissions), with copy resolved for the current locale. */
export function useFaqCatalog(granted: readonly string[]): FaqTopicView[] {
  const t = useTranslations("faq.topics");
  return useMemo(
    () =>
      visibleFaqTopics(granted).map((topic) => {
        const id = topic.id as FaqTopicId;
        return {
          id,
          route: topic.route,
          title: t(`${id}.title`),
          summary: t(`${id}.summary`),
          entries: topic.questions.map((q) => ({
            topic: id,
            id: q,
            question: t(`${id}.items.${q}.q`),
            answer: t(`${id}.items.${q}.a`),
          })),
        };
      }),
    [granted, t],
  );
}
