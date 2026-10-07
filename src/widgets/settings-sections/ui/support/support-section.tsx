"use client";

import { MessageSquareReply } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { supportApi, type SupportRequest } from "@/entities/support";
import { SupportRequestForm } from "@/features/submit-support-request";
import { formatDateTime } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { InsetGroup, QueryState } from "@/shared/ui";
import { Description, RequestRow } from "./request-row";

/** Ask the platform team for help, and follow what happened to earlier requests. */
export function SupportSection() {
  const t = useTranslations("settings.support");
  const locale = useLocale();
  const query = useApiQuery(() => supportApi.mine(), [], { cacheKey: ["support-mine"] });
  const items = query.data ?? [];

  function added(request: SupportRequest) {
    query.setData((prev) => [request, ...(prev ?? []).filter((r) => r.id !== request.id)]);
  }

  return (
    <div className="space-y-6" data-testid="support-section">
      <section>
        <h2 className="px-4 pb-1.5 text-[12.5px] font-medium uppercase tracking-wide text-zinc-500">{t("newTitle")}</h2>
        <SupportRequestForm onSubmitted={added} />
      </section>

      <QueryState
        loadingVariant="lines"
        loading={query.loading && !query.data}
        error={query.error}
        onRetry={() => void query.reload()}
      >
        <InsetGroup title={t("mineTitle")} footer={items.length ? t("mineFooter") : undefined} data-testid="support-mine">
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13.5px] text-zinc-500" data-testid="support-mine-empty">
              {t("mineEmpty")}
            </p>
          ) : (
            items.map((r) => (
              <RequestRow key={r.id} request={r}>
                <Description text={r.description} />
                {r.adminNote ? (
                  <div className="rounded-2xl bg-sky-50/70 px-3 py-2.5" data-testid="support-reply">
                    <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-sky-800">
                      <MessageSquareReply className="h-3.5 w-3.5" aria-hidden />
                      {t("reply")}
                    </p>
                    <Description text={r.adminNote} />
                  </div>
                ) : (
                  <p className="text-[12.5px] text-zinc-500">{t(r.status === "resolved" ? "resolvedNoReply" : "awaiting")}</p>
                )}
                {r.resolvedAt ? (
                  <p className="text-[12px] text-zinc-500">{t("resolvedAt", { date: formatDateTime(r.resolvedAt, locale) })}</p>
                ) : null}
              </RequestRow>
            ))
          )}
        </InsetGroup>
      </QueryState>
    </div>
  );
}
