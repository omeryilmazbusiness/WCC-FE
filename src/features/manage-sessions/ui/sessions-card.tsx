"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LogOut, Monitor, MonitorSmartphone, Smartphone } from "lucide-react";
import type { BackendSession } from "@/shared/api/auth-contract";
import { formatDateTime, formatRelativeTime } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  QueryState,
  useMutationFeedback,
} from "@/shared/ui";
import { parseUserAgent } from "../lib/user-agent";
import { listSessions, revokeOtherSessions, revokeSession, sortSessions } from "../model/sessions-api";

type Props = {
  /** Ends this device's session through the app's normal logout flow. */
  onSignOutCurrent: () => Promise<void> | void;
};

type PendingAction = { kind: "session"; session: BackendSession } | { kind: "others" };

export function SessionsCard({ onSignOutCurrent }: Props) {
  const t = useTranslations("security.sessions");
  const feedback = useMutationFeedback();
  const sessions = useApiQuery(listSessions, []);
  const rows = useMemo(() => sortSessions(sessions.data ?? []), [sessions.data]);
  const othersCount = rows.filter((s) => !s.current).length;
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.kind === "others") {
        const { revoked } = await revokeOtherSessions();
        feedback.success(t("othersRevokedToast", { count: revoked }));
      } else if (pending.session.current) {
        await onSignOutCurrent();
        return;
      } else {
        await revokeSession(pending.session.id);
        feedback.success(t("revokedToast"));
      }
      setPending(null);
      void sessions.reload();
    } catch (err) {
      feedback.error(err, t("revokeError"));
    } finally {
      setBusy(false);
    }
  }

  const dialog = dialogCopy(pending, t);

  return (
    <Card data-testid="sessions-card">
      <CardHeader>
        <div className="flex flex-wrap items-start gap-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
            <MonitorSmartphone className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={othersCount === 0 || busy}
            onClick={() => setPending({ kind: "others" })}
            data-testid="sessions-revoke-others"
          >
            <LogOut className="h-3.5 w-3.5 rtl:-scale-x-100" strokeWidth={1.75} />
            {t("signOutOthers")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <QueryState
          loading={sessions.loading && !sessions.data}
          error={sessions.error}
          onRetry={() => void sessions.reload()}
          empty={rows.length === 0}
          emptyTitle={t("empty")}
        >
          <ul className="divide-y divide-zinc-100">
            {rows.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                disabled={busy}
                onSignOut={() => setPending({ kind: "session", session })}
              />
            ))}
          </ul>
        </QueryState>
      </CardContent>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={dialog.title}
        description={dialog.description}
        confirmLabel={dialog.confirm}
        cancelLabel={t("cancel")}
        onConfirm={() => void confirm()}
        pending={busy}
        destructive
      />
    </Card>
  );
}

type Translate = ReturnType<typeof useTranslations<"security.sessions">>;

function dialogCopy(pending: PendingAction | null, t: Translate) {
  if (pending?.kind === "others") {
    return {
      title: t("confirmOthersTitle"),
      description: t("confirmOthersDescription"),
      confirm: t("signOutOthers"),
    };
  }
  if (pending?.session.current) {
    return {
      title: t("confirmCurrentTitle"),
      description: t("confirmCurrentDescription"),
      confirm: t("signOut"),
    };
  }
  return {
    title: t("confirmTitle"),
    description: t("confirmDescription"),
    confirm: t("signOut"),
  };
}

function SessionRow({
  session,
  disabled,
  onSignOut,
}: {
  session: BackendSession;
  disabled: boolean;
  onSignOut: () => void;
}) {
  const t = useTranslations("security.sessions");
  const locale = useLocale();
  const device = parseUserAgent(session.user_agent);
  const Icon = device.mobile ? Smartphone : Monitor;
  const label =
    device.browser && device.os
      ? t("deviceOn", { browser: device.browser, os: device.os })
      : (device.browser ?? device.os ?? t("unknownDevice"));

  return (
    <li className="flex items-center gap-4 py-4 first:pt-0 last:pb-0" data-testid="session-row">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-zinc-900" title={session.user_agent}>
            {label}
          </p>
          {session.current ? (
            <Badge className="bg-emerald-50 normal-case text-emerald-700">{t("thisDevice")}</Badge>
          ) : null}
        </div>
        <p className="flex flex-wrap items-center gap-x-1.5 text-xs font-medium text-zinc-500">
          {session.last_ip ? (
            <>
              <bdi dir="ltr">{session.last_ip}</bdi>
              <span aria-hidden>·</span>
            </>
          ) : null}
          <span>{t(`methods.${session.auth_method}`)}</span>
          <span aria-hidden>·</span>
          <time dateTime={session.last_seen_at} title={formatDateTime(session.last_seen_at, locale)}>
            {session.current
              ? t("activeNow")
              : t("lastActive", { time: formatRelativeTime(session.last_seen_at, locale) })}
          </time>
        </p>
      </div>
      <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onSignOut}>
        {t("signOut")}
      </Button>
    </li>
  );
}
