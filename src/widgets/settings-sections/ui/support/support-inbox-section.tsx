"use client";

import { useState, type ReactNode } from "react";
import { Building2, Globe2, Mail } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { SUPPORT_STATUSES, supportApi, type InboundRequest, type SupportInbox, type SupportStatus } from "@/entities/support";
import { SupportRequestEditor } from "@/features/manage-support-request";
import { formatNumber } from "@/shared/lib/format";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { Button, InsetGroup, QueryState, SearchField, SegmentedControl } from "@/shared/ui";
import { Description, RequestRow } from "./request-row";

const PAGE = 50;

type Filter = "all" | SupportStatus;

/** Platform admin inbox: every company's help requests, newest open first. */
export function SupportInboxSection() {
  const t = useTranslations("settings.supportInbox");
  const tStatus = useTranslations("support.status");
  const locale = useLocale();
  const [filter, setFilter] = useState<Filter>("open");
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim(), 300);
  const [limit, setLimit] = useState(PAGE);
  const status = filter === "all" ? undefined : filter;

  const query = useApiQuery(() => supportApi.inbox({ status, q, limit }), [status, q, limit], {
    cacheKey: ["support-inbox", status ?? "all", q, limit],
  });
  const inbox = query.data;
  const counts = inbox?.counts;
  const all = counts ? SUPPORT_STATUSES.reduce((n, s) => n + counts[s], 0) : 0;
  const count = (n: number) => (counts ? ` ${formatNumber(n, locale)}` : "");

  function saved(next: InboundRequest) {
    query.setData((prev) => (prev ? patch(prev, next, status) : prev));
  }

  return (
    <div className="space-y-4" data-testid="support-inbox">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl<Filter>
          value={filter}
          onChange={(f) => {
            setFilter(f);
            setLimit(PAGE);
          }}
          aria-label={t("filter")}
          options={[
            ...SUPPORT_STATUSES.map((s) => ({ value: s as Filter, label: `${tStatus(s)}${count(counts?.[s] ?? 0)}` })),
            { value: "all" as Filter, label: `${t("all")}${count(all)}` },
          ]}
        />
        <SearchField
          value={search}
          onValueChange={(v) => {
            setSearch(v);
            setLimit(PAGE);
          }}
          onClear={() => setSearch("")}
          placeholder={t("search")}
          containerClassName="sm:w-72"
          data-testid="support-inbox-search"
        />
      </div>

      <QueryState loadingVariant="lines" loading={query.loading && !inbox} error={query.error} onRetry={() => void query.reload()}>
        <InsetGroup
          footer={inbox && inbox.total > 0 ? t("footer", { shown: inbox.items.length, total: inbox.total }) : undefined}
          data-testid="support-inbox-list"
        >
          {!inbox || inbox.items.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13.5px] text-zinc-500" data-testid="support-inbox-empty">
              {q ? t("noMatches") : t("empty")}
            </p>
          ) : (
            inbox.items.map((r) => (
              <RequestRow key={r.id} request={r} subtitle={`${r.requester.name || r.requester.email} · ${r.company || "—"}`}>
                <Description text={r.description} />
                <dl className="grid gap-1.5 text-[12.5px] text-zinc-600 sm:grid-cols-2">
                  <Meta icon={Mail} label={t("requester")}>
                    <a href={`mailto:${r.requester.email}`} className="text-[#007AFF] hover:underline" dir="ltr">
                      {r.requester.email}
                    </a>
                    {r.requester.role ? <span className="text-zinc-400"> · {r.requester.role}</span> : null}
                  </Meta>
                  <Meta icon={Building2} label={t("workspace")}>
                    {[r.company, r.branch].filter(Boolean).join(" / ") || "—"}
                  </Meta>
                  <Meta icon={Globe2} label={t("language")}>
                    {r.locale === "ar" ? "العربية" : "English"}
                    {r.page ? <span className="text-zinc-400" dir="ltr"> · {r.page}</span> : null}
                  </Meta>
                </dl>
                <SupportRequestEditor key={`${r.id}:${r.updatedAt}`} request={r} onSaved={saved} />
              </RequestRow>
            ))
          )}
        </InsetGroup>
        {inbox && inbox.items.length < inbox.total ? (
          <div className="flex justify-center">
            <Button variant="outline" className="rounded-full" onClick={() => setLimit((l) => Math.min(l + PAGE, 100))} disabled={limit >= 100}>
              {limit >= 100 ? t("narrow") : t("more")}
            </Button>
          </div>
        ) : null}
      </QueryState>
    </div>
  );
}

/** Applies a saved request to the list; it leaves a status filter it no longer matches. */
function patch(inbox: SupportInbox, next: InboundRequest, status: SupportStatus | undefined): SupportInbox {
  const before = inbox.items.find((r) => r.id === next.id);
  if (!before) return inbox;
  const counts = { ...inbox.counts };
  if (before.status !== next.status) {
    counts[before.status] = Math.max(0, counts[before.status] - 1);
    counts[next.status] += 1;
  }
  const leaves = status !== undefined && next.status !== status;
  return {
    items: leaves ? inbox.items.filter((r) => r.id !== next.id) : inbox.items.map((r) => (r.id === next.id ? next : r)),
    total: leaves ? Math.max(0, inbox.total - 1) : inbox.total,
    counts,
  };
}

function Meta({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-1.5">
      <dt className="shrink-0">
        <Icon className="mt-0.5 h-3.5 w-3.5 text-zinc-400" aria-hidden />
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="min-w-0 truncate">{children}</dd>
    </div>
  );
}
