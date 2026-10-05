"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeftRight, CreditCard, FileUp, HandCoins, Pencil, Plus, PlusCircle, Receipt, Sparkles } from "lucide-react";
import { ACCOUNT_LOOK, bpsToPercent, MATCH_LOOK, MOVEMENT_LOOK, type Account, type Movement } from "@/entities/finance";
import type { FinanceTabProps } from "./tab-props";
import { useCan } from "@/entities/viewer";
import { AccountDialog, FeedImportDialog, MatchDialog, MovementDialog, TransferDialog } from "@/features/finance-treasury";
import { cn } from "@/shared/lib/cn";
import { formatMoney, formatMoneyShort, formatPercent } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { Button, EmptyState, IconButton, QueryState, TONES } from "@/shared/ui";
import { MoneyRow, Pill } from "./primitives";
import { Section } from "./section";

type Dialog =
  | { kind: "account"; account: Account | null }
  | { kind: "movement"; account: Account }
  | { kind: "feed"; account: Account }
  | { kind: "transfer" }
  | { kind: "match"; movement: Movement }
  | null;

export function TreasuryTab({ repository, onChanged }: FinanceTabProps) {
  const t = useTranslations("financeHub");
  const locale = useLocale();
  const canWrite = useCan("payments.write");
  const canApprove = useCan("payments.approve");
  const live = { liveTopics: ["payment"] as const };
  const accounts = useApiQuery(() => repository.accounts(), [repository], { ...live, cacheKey: ["finance", "accounts"] });
  const unmatched = useApiQuery(() => repository.movements({ unmatched: true }), [repository], { ...live, cacheKey: ["finance", "unmatched"] });
  const recent = useApiQuery(() => repository.movements(), [repository], { ...live, cacheKey: ["finance", "movements"] });
  const pos = useApiQuery(() => repository.posStats(), [repository], { ...live, cacheKey: ["finance", "pos"] });
  const [dialog, setDialog] = useState<Dialog>(null);
  const list = accounts.data ?? [];
  const nameOf = (id: string) => list.find((a) => a.id === id)?.name ?? "";
  const refresh = () => {
    void accounts.refresh();
    void unmatched.refresh();
    void recent.refresh();
    void pos.refresh();
    onChanged?.();
  };
  const close = (open: boolean) => !open && setDialog(null);

  return (
    <div className="space-y-5" data-testid="finance-treasury">
      <Section
        icon={CreditCard}
        tone="indigo"
        title={t("treasury.accounts")}
        subtitle={t("treasury.accountsHint")}
        actions={
          <>
            {canWrite && list.length > 1 ? (
              <Button variant="secondary" onClick={() => setDialog({ kind: "transfer" })} data-testid="finance-transfer">
                <ArrowLeftRight className="h-4 w-4" aria-hidden />
                {t("treasury.transfer")}
              </Button>
            ) : null}
            {canApprove ? (
              <Button onClick={() => setDialog({ kind: "account", account: null })} data-testid="finance-new-account">
                <Plus className="h-4 w-4" aria-hidden />
                {t("treasury.newAccount")}
              </Button>
            ) : null}
          </>
        }
      >
        <QueryState loading={accounts.loading} loadingVariant="cards" error={accounts.error} onRetry={() => void accounts.reload()} empty={list.length === 0} emptyTitle={t("treasury.noAccounts")} emptyDescription={t("treasury.noAccountsHint")}>
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((a) => (
              <AccountCard
                key={a.id}
                account={a}
                onPost={canWrite && a.isActive ? () => setDialog({ kind: "movement", account: a }) : undefined}
                onFeed={canWrite && a.isActive && (a.kind === "bank" || a.kind === "pos") ? () => setDialog({ kind: "feed", account: a }) : undefined}
                onEdit={canApprove ? () => setDialog({ kind: "account", account: a }) : undefined}
              />
            ))}
          </div>
        </QueryState>
      </Section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section icon={HandCoins} tone="amber" title={t("treasury.unmatched")} subtitle={t("treasury.unmatchedHint")}>
          <QueryState loading={unmatched.loading} loadingVariant="list" error={unmatched.error} onRetry={() => void unmatched.reload()}>
            {(unmatched.data ?? []).length === 0 ? (
              <EmptyState title={t("treasury.allMatched")} description={t("treasury.allMatchedHint")} />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {(unmatched.data ?? []).map((m) => (
                  <MoneyRow
                    key={m.id}
                    icon={MATCH_LOOK.unmatched.icon}
                    tone="amber"
                    title={m.counterparty || m.reference || t("treasury.unknownSender")}
                    subtitle={`${m.occurredOn} · ${nameOf(m.accountId)} · ${m.reference || m.note || "—"}`}
                    amount={`+${formatMoney(m.amount, locale, m.currency)}`}
                    amountTone="positive"
                    actions={
                      canWrite ? (
                        <Button size="sm" onClick={() => setDialog({ kind: "match", movement: m })} data-testid="finance-match">
                          {t("treasury.match")}
                        </Button>
                      ) : null
                    }
                  />
                ))}
              </ul>
            )}
          </QueryState>
        </Section>

        <Section icon={Receipt} tone="sky" title={t("treasury.recent")}>
          <QueryState loading={recent.loading} loadingVariant="list" error={recent.error} onRetry={() => void recent.reload()} empty={(recent.data ?? []).length === 0} emptyTitle={t("treasury.noMovements")}>
            <ul className="divide-y divide-zinc-100">
              {(recent.data ?? []).slice(0, 12).map((m) => (
                <MoneyRow
                  key={m.id}
                  icon={MOVEMENT_LOOK[m.kind].icon}
                  tone={MOVEMENT_LOOK[m.kind].tone}
                  title={
                    <span className="flex items-center gap-2">
                      {t(`movementKind.${m.kind}`)}
                      {m.matchStatus === "matched" || m.matchStatus === "ignored" ? <Pill tone={MATCH_LOOK[m.matchStatus].tone}>{t(`match.${m.matchStatus}`)}</Pill> : null}
                    </span>
                  }
                  subtitle={`${m.occurredOn} · ${nameOf(m.accountId)}${m.counterparty ? ` · ${m.counterparty}` : ""}`}
                  amount={`${m.direction === "in" ? "+" : "−"}${formatMoney(m.amount, locale, m.currency)}`}
                  amountTone={m.direction === "in" ? "positive" : "negative"}
                  amountHint={m.fee ? t("treasury.feeShort", { fee: formatMoney(m.fee, locale, m.currency) }) : undefined}
                />
              ))}
            </ul>
          </QueryState>
        </Section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Section icon={CreditCard} tone="violet" title={t("treasury.pos")} subtitle={t("treasury.posHint")}>
          <QueryState loading={pos.loading} loadingVariant="list" error={pos.error} onRetry={() => void pos.reload()} empty={(pos.data ?? []).length === 0} emptyTitle={t("treasury.noPos")}>
            <div className="grid gap-3 sm:grid-cols-2">
              {(pos.data ?? []).map((p) => {
                const drift = p.effectiveBps - p.commissionBps;
                return (
                  <div key={p.accountId} className="rounded-[22px] bg-zinc-50/80 p-4 ring-1 ring-inset ring-zinc-900/[0.04]" data-testid="pos-stat">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[14px] font-semibold text-zinc-900">{p.name}</span>
                      <Pill tone={drift > 0 ? "rose" : "emerald"}>{formatPercent(bpsToPercent(p.effectiveBps), locale, 2)}</Pill>
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
                      <div>
                        <dt className="text-zinc-400">{t("treasury.gross")}</dt>
                        <dd className="font-semibold tabular-nums text-zinc-900">{formatMoneyShort(p.gross, locale, p.currency)}</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-400">{t("treasury.fees")}</dt>
                        <dd className="font-semibold tabular-nums text-rose-600">{formatMoneyShort(p.fees, locale, p.currency)}</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-400">{t("treasury.net")}</dt>
                        <dd className="font-semibold tabular-nums text-emerald-700">{formatMoneyShort(p.net, locale, p.currency)}</dd>
                      </div>
                    </dl>
                    <p className="mt-2 text-[11.5px] text-zinc-500">
                      {t("treasury.posContract", { rate: formatPercent(bpsToPercent(p.commissionBps), locale, 2), count: p.count })}
                    </p>
                  </div>
                );
              })}
            </div>
          </QueryState>
        </Section>

        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-zinc-900 via-zinc-800 to-indigo-900 p-6 text-white" data-testid="vcc-tile">
          <div className="absolute -end-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/30 blur-2xl" aria-hidden />
          <span className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/10 ring-1 ring-white/20" aria-hidden>
            <Sparkles className="h-7 w-7" />
          </span>
          <h3 className="mt-4 text-[18px] font-semibold tracking-tight">{t("treasury.vcc")}</h3>
          <p className="mt-1 text-[13px] text-white/70">{t("treasury.vccHint")}</p>
          <div className="mt-5 flex items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold ring-1 ring-white/20">{t("notConnected")}</span>
          </div>
          <div className="mt-6 font-mono text-[15px] tracking-[0.25em] text-white/50" aria-hidden>
            •••• •••• •••• 0000
          </div>
        </section>
      </div>

      {dialog?.kind === "account" ? <AccountDialog repository={repository} account={dialog.account} open onOpenChange={close} onSaved={refresh} /> : null}
      {dialog?.kind === "movement" ? <MovementDialog repository={repository} account={dialog.account} open onOpenChange={close} onPosted={refresh} /> : null}
      {dialog?.kind === "feed" ? <FeedImportDialog repository={repository} account={dialog.account} open onOpenChange={close} onImported={refresh} /> : null}
      {dialog?.kind === "transfer" ? <TransferDialog repository={repository} accounts={list} open onOpenChange={close} onDone={refresh} /> : null}
      {dialog?.kind === "match" ? <MatchDialog repository={repository} movement={dialog.movement} open onOpenChange={close} onDone={refresh} /> : null}
    </div>
  );
}

function AccountCard({ account: a, onPost, onFeed, onEdit }: { account: Account; onPost?: () => void; onFeed?: () => void; onEdit?: () => void }) {
  const t = useTranslations("financeHub");
  const locale = useLocale();
  const look = ACCOUNT_LOOK[a.kind];
  const Icon = look.icon;
  return (
    <div
      className={cn("rounded-[26px] border border-zinc-200/60 bg-gradient-to-br p-4 transition", TONES[look.tone].tint, !a.isActive && "opacity-60")}
      data-testid="finance-account"
    >
      <div className="flex items-start gap-3">
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", TONES[look.tone].gradient)} aria-hidden>
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px] font-semibold text-zinc-900">{a.name}</div>
          <div className="truncate text-[12px] text-zinc-500">
            {t(`accountKind.${a.kind}`)}
            {a.bankName ? ` · ${a.bankName}` : ""}
          </div>
        </div>
        {onEdit ? (
          <IconButton label={t("treasury.editAccount")} variant="ghost" onClick={onEdit} className="h-9 w-9">
            <Pencil className="h-4 w-4" />
          </IconButton>
        ) : null}
      </div>
      <div className={cn("mt-4 text-[24px] font-semibold tracking-tight tabular-nums", a.balance < 0 ? "text-rose-600" : "text-zinc-950")}>
        {formatMoney(a.balance, locale, a.currency)}
      </div>
      <div className="mt-1 flex min-h-6 flex-wrap items-center gap-1.5">
        {a.lowBalance ? <Pill tone="amber">{t("treasury.low")}</Pill> : null}
        {!a.isActive ? <Pill tone="zinc">{t("treasury.inactive")}</Pill> : null}
        {a.kind === "pos" && a.commissionBps ? <Pill tone="violet">{formatPercent(bpsToPercent(a.commissionBps), locale, 2)}</Pill> : null}
      </div>
      {onPost || onFeed ? (
        <div className="mt-3 flex gap-2">
          {onPost ? (
            <Button size="sm" variant="secondary" onClick={onPost} className="flex-1" data-testid="finance-post">
              <PlusCircle className="h-4 w-4" aria-hidden />
              {t("treasury.post")}
            </Button>
          ) : null}
          {onFeed ? (
            <Button size="sm" variant="secondary" onClick={onFeed} className="flex-1" data-testid="finance-feed">
              <FileUp className="h-4 w-4" aria-hidden />
              {t("treasury.feed")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
