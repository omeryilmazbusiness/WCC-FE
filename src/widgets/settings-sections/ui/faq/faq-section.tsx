"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ChevronsDownUp, ChevronsUpDown, SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import { faqAnchor, searchFaq, type FaqEntry, type FaqTopicId } from "@/entities/faq";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { GlyphTile, InsetGroup, SearchField } from "@/shared/ui";
import { useFaqCatalog, type FaqTopicView } from "../../model/use-faq-catalog";
import { FaqItem } from "./faq-item";
import { FAQ_TOPIC_LOOK } from "./faq-look";

type Group = { topic: FaqTopicView; entries: FaqEntry[] };
type TopicFilter = FaqTopicId | "all";

const anchorOf = (e: FaqEntry) => faqAnchor(e.topic, e.id);

/** Groups search hits by topic; topics are ordered by their best-ranked hit. */
function groupHits(topics: readonly FaqTopicView[], hits: readonly FaqEntry[]): Group[] {
  const byId = new Map(topics.map((t) => [t.id, t]));
  const groups = new Map<FaqTopicId, Group>();
  for (const hit of hits) {
    const topic = byId.get(hit.topic);
    if (!topic) continue;
    const group = groups.get(hit.topic) ?? { topic, entries: [] };
    group.entries.push(hit);
    groups.set(hit.topic, group);
  }
  return [...groups.values()];
}

/** Searchable help for every screen the viewer can open, grouped by topic. */
export function FaqSection() {
  const t = useTranslations("faq.ui");
  const topics = useFaqCatalog();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TopicFilter>("all");
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const deferred = useDeferredValue(query);
  const terms = useMemo(() => deferred.trim().split(/\s+/).filter(Boolean), [deferred]);
  const searching = terms.length > 0;

  const groups = useMemo<Group[]>(() => {
    const scoped = filter === "all" ? topics : topics.filter((tp) => tp.id === filter);
    if (!searching) return scoped.map((topic) => ({ topic, entries: topic.entries }));
    return groupHits(scoped, searchFaq(scoped.flatMap((tp) => tp.entries), deferred));
  }, [topics, filter, searching, deferred]);

  const visible = useMemo(() => groups.flatMap((g) => g.entries.map(anchorOf)), [groups]);
  const allOpen = visible.length > 0 && visible.every((a) => open.has(a));

  useEffect(() => {
    const target = decodeURIComponent(window.location.hash.slice(1));
    if (!target.startsWith("faq-")) return;
    setOpen((prev) => new Set(prev).add(target));
    const frame = requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, []);

  function toggle(anchor: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(anchor)) next.delete(anchor);
      else next.add(anchor);
      return next;
    });
  }

  function toggleAll() {
    setOpen((prev) => {
      const next = new Set(prev);
      for (const a of visible) {
        if (allOpen) next.delete(a);
        else next.add(a);
      }
      return next;
    });
  }

  return (
    <div className="space-y-6" data-testid="faq-section">
      <div className="space-y-3">
        <SearchField
          value={query}
          onValueChange={setQuery}
          onClear={() => setQuery("")}
          clearLabel={t("clear")}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          variant="minimal"
          data-testid="faq-search"
        />
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={t("allTopics")}>
          <TopicChip label={t("allTopics")} active={filter === "all"} onClick={() => setFilter("all")} />
          {topics.map((tp) => (
            <TopicChip
              key={tp.id}
              label={tp.title}
              icon={FAQ_TOPIC_LOOK[tp.id]}
              active={filter === tp.id}
              onClick={() => setFilter((f) => (f === tp.id ? "all" : tp.id))}
              testId={`faq-topic-${tp.id}`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between px-1">
          <p className="text-[12.5px] font-medium text-zinc-500" aria-live="polite" data-testid="faq-count">
            {t("results", { count: visible.length })}
          </p>
          {visible.length > 0 ? (
            <button
              type="button"
              onClick={toggleAll}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[12.5px] font-semibold text-[#007AFF] transition hover:bg-[#007AFF]/10"
              data-testid="faq-toggle-all"
            >
              {allOpen ? <ChevronsDownUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden />}
              {allOpen ? t("collapseAll") : t("expandAll")}
            </button>
          ) : null}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[20px] bg-white px-6 py-12 text-center ring-1 ring-zinc-200/60" data-testid="faq-empty">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
            <SearchX className="h-6 w-6" aria-hidden />
          </span>
          <p className="text-[15px] font-semibold text-zinc-900">{t("emptyTitle")}</p>
          <p className="max-w-sm text-[13px] text-zinc-500">{t("emptyBody")}</p>
        </div>
      ) : (
        groups.map(({ topic, entries }) => (
          <section key={topic.id} aria-labelledby={`faq-topic-${topic.id}-title`} data-testid={`faq-group-${topic.id}`}>
            <header className="mb-2 flex items-center gap-3 px-1">
              <GlyphTile icon={FAQ_TOPIC_LOOK[topic.id].icon} tone={FAQ_TOPIC_LOOK[topic.id].tone} size="md" />
              <div className="min-w-0 flex-1">
                <h2 id={`faq-topic-${topic.id}-title`} className="text-[16px] font-semibold tracking-tight text-zinc-950">
                  {topic.title}
                </h2>
                <p className="truncate text-[12.5px] text-zinc-500">
                  {topic.summary} · {t("topicCount", { count: entries.length })}
                </p>
              </div>
              {topic.route ? (
                <Link
                  href={topic.route}
                  className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12.5px] font-semibold text-[#007AFF] transition hover:bg-[#007AFF]/10"
                  data-testid={`faq-open-${topic.id}`}
                >
                  {t("openScreen")}
                  <ArrowUpRight className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden />
                </Link>
              ) : null}
            </header>
            <InsetGroup>
              {entries.map((entry) => {
                const anchor = anchorOf(entry);
                return <FaqItem key={anchor} entry={entry} open={open.has(anchor)} onToggle={() => toggle(anchor)} terms={terms} />;
              })}
            </InsetGroup>
          </section>
        ))
      )}

      <p className="px-4 text-[12px] leading-relaxed text-zinc-500">{t("footer")}</p>
    </div>
  );
}

function TopicChip({
  label,
  icon,
  active,
  onClick,
  testId,
}: {
  label: string;
  icon?: (typeof FAQ_TOPIC_LOOK)[FaqTopicId];
  active: boolean;
  onClick: () => void;
  testId?: string;
}) {
  const Icon = icon?.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors",
        active ? "bg-zinc-900 text-white" : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50",
      )}
      data-testid={testId}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
      {label}
    </button>
  );
}
