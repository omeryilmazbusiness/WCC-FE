"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { visibleFaqTopics, type FaqEntry, type FaqTopic, type FaqTopicId } from "@/entities/faq";
import { usePermissions } from "@/entities/viewer";

export type FaqTopicView = {
  id: FaqTopicId;
  route?: FaqTopic["route"];
  title: string;
  summary: string;
  entries: FaqEntry[];
};

/** Topics the viewer may read, with their copy resolved for the current locale. */
export function useFaqCatalog(): FaqTopicView[] {
  const t = useTranslations("faq.topics");
  const permissions = usePermissions();
  return useMemo(
    () =>
      visibleFaqTopics(permissions).map((topic) => {
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
    [permissions, t],
  );
}
