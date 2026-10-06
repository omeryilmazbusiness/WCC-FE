"use client";

import { useMemo, useState } from "react";
import { SearchX, UserPlus, UsersRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  COMPANY_ROLES,
  ROLE_ORDER,
  filterMembers,
  sortMembers,
  summarizeTeam,
  type ApiUser,
  type MemberFilter,
} from "@/entities/identity";
import { useCan } from "@/entities/viewer";
import { RevokeUserSessionsDialog } from "@/features/revoke-user-sessions";
import { Button, ConfirmDialog, PageHeader, QueryState, Screen } from "@/shared/ui";
import { useMemberActions } from "../model/use-member-actions";
import { useTeam } from "../model/use-team";
import { MemberCard, type MemberAction } from "./member-card";
import { MemberDialog } from "./member-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { TeamSummary } from "./team-summary";
import { TeamToolbar } from "./team-toolbar";

type Open = { kind: "create" } | { kind: Exclude<MemberAction, "unlock" | "activate">; member: ApiUser } | null;

const ALL: MemberFilter = { query: "", role: "all", status: "all" };

/** Team page: headline stats, filters and a grid of member cards with every admin action one tap away. */
export function TeamBoard() {
  const t = useTranslations("team");
  const locale = useLocale();
  const team = useTeam();
  const canRead = useCan("users.read");
  const canWrite = useCan("users.write");
  const canUnlock = useCan("users.unlock");
  const actions = useMemberActions(team.members.reload);
  const [filter, setFilter] = useState<MemberFilter>(ALL);
  const [open, setOpen] = useState<Open>(null);

  const users = team.members.data?.users;
  const sorted = useMemo(() => sortMembers(users ?? [], locale), [users, locale]);
  const summary = useMemo(() => summarizeTeam(sorted), [sorted]);
  const visible = useMemo(() => filterMembers(sorted, filter), [sorted, filter]);
  const chipRoles = useMemo(() => ROLE_ORDER.filter((r) => summary.byRole[r]), [summary]);
  const pickRoles = useMemo(() => COMPANY_ROLES.filter((r) => r !== "gm" || team.canGrantGm), [team.canGrantGm]);
  const canCreate = canWrite && !team.platform;

  function onAction(action: MemberAction, member: ApiUser) {
    if (action === "unlock") void actions.unlock(member);
    else if (action === "activate") void actions.setActive(member, true);
    else setOpen({ kind: action, member });
  }

  const close = () => setOpen(null);
  const teamName = (id?: string | null) => {
    const unit = id ? team.teamById.get(id) : undefined;
    return unit ? (locale === "ar" && unit.name_ar) || unit.name_en || unit.code : undefined;
  };
  const addButton = canCreate ? (
    <Button type="button" size="lg" onClick={() => setOpen({ kind: "create" })} data-testid="team-add">
      <UserPlus className="h-[18px] w-[18px]" aria-hidden />
      {t("add")}
    </Button>
  ) : null;

  return (
    <Screen data-testid="team-board">
      <PageHeader
        title={team.platform ? t("platformTitle") : t("title")}
        description={team.platform ? t("platformSubtitle") : t("subtitle")}
        actions={addButton}
      />
      <QueryState
        forbidden={!canRead}
        loading={team.members.loading && !users}
        loadingVariant="cards"
        error={team.members.error}
        onRetry={team.members.reload}
      >
        {sorted.length === 0 ? (
          <Hero title={team.platform ? t("empty.platformTitle") : t("empty.title")} body={team.platform ? t("empty.platformBody") : t("empty.body")} action={addButton} />
        ) : (
          <div className="space-y-5">
            <TeamSummary summary={summary} />
            <TeamToolbar filter={filter} onChange={setFilter} summary={summary} roles={team.platform ? [] : chipRoles} />
            {visible.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-[28px] border border-dashed border-zinc-200 bg-white/60 px-6 py-14 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-zinc-100 text-zinc-500">
                  <SearchX className="h-7 w-7" aria-hidden />
                </span>
                <p className="text-[15px] font-semibold text-zinc-900">{t("empty.filteredTitle")}</p>
                <Button type="button" variant="secondary" size="sm" onClick={() => setFilter(ALL)}>
                  {t("filters.clear")}
                </Button>
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="team-grid">
                {visible.map((m) => (
                  <MemberCard
                    key={m.id}
                    member={m}
                    teamName={teamName(m.team_id)}
                    self={m.id === team.viewerId}
                    platform={team.platform}
                    busy={actions.busyId === m.id}
                    can={{ write: canWrite, unlock: canUnlock }}
                    onAction={onAction}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </QueryState>

      {open?.kind === "create" || open?.kind === "edit" ? (
        <MemberDialog
          key={open.kind === "edit" ? open.member.id : "new"}
          open
          onOpenChange={(next) => !next && close()}
          member={open.kind === "edit" ? open.member : undefined}
          roles={pickRoles}
          teams={team.teams}
          branchId={team.branchId}
          self={open.kind === "edit" && open.member.id === team.viewerId}
          lockRole={team.platform}
          busy={actions.busyId === (open.kind === "edit" ? open.member.id : "new")}
          onCreate={actions.create}
          onUpdate={actions.update}
        />
      ) : null}
      {open?.kind === "password" ? (
        <ResetPasswordDialog
          key={open.member.id}
          member={open.member}
          open
          onOpenChange={(next) => !next && close()}
          busy={actions.busyId === open.member.id}
          onReset={actions.resetPassword}
        />
      ) : null}
      {open?.kind === "signOut" ? (
        <RevokeUserSessionsDialog userId={open.member.id} userName={open.member.full_name} open onOpenChange={(next) => !next && close()} />
      ) : null}
      {open?.kind === "deactivate" ? (
        <ConfirmDialog
          open
          onOpenChange={(next) => !next && close()}
          title={t("deactivate.title", { name: open.member.full_name })}
          description={t("deactivate.body")}
          confirmLabel={t("deactivate.confirm")}
          cancelLabel={t("form.cancel")}
          destructive
          pending={actions.busyId === open.member.id}
          onConfirm={() => void actions.setActive(open.member, false).then((ok) => ok && close())}
        />
      ) : null}
    </Screen>
  );
}

function Hero({ title, body, action }: { title: string; body: string; action: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-zinc-200/60 bg-gradient-to-br from-indigo-50 via-white to-sky-50 px-6 py-16 text-center" data-testid="team-empty">
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-[0_18px_40px_-18px_rgba(79,70,229,0.7)]">
        <UsersRound className="h-10 w-10" aria-hidden />
      </span>
      <p className="mt-5 text-xl font-semibold tracking-tight text-zinc-950">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-[14px] text-zinc-500">{body}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
