"use client";

import { CalendarDays, KeyRound, LockOpen, LogOut, MoreHorizontal, PencilLine, Power, ShieldCheck, UsersRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ROLE_LOOK, STATUS_LOOK, memberStatus, type ApiUser } from "@/entities/identity";
import { cn } from "@/shared/lib/cn";
import { formatDate } from "@/shared/lib/format";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  TONES,
} from "@/shared/ui";
import { MemberAvatar } from "./member-avatar";

export type MemberAction = "edit" | "password" | "unlock" | "signOut" | "deactivate" | "activate";

export type MemberPermissions = { write: boolean; unlock: boolean };

type Props = {
  member: ApiUser;
  teamName?: string;
  self: boolean;
  /** Platform view: show the company instead of role and team. */
  platform: boolean;
  busy: boolean;
  can: MemberPermissions;
  onAction: (action: MemberAction, member: ApiUser) => void;
};

/** iOS contact-style card: avatar, name, role and status pills, quick unlock and a menu of actions. */
export function MemberCard({ member, teamName, self, platform, busy, can, onAction }: Props) {
  const t = useTranslations("team");
  const locale = useLocale();
  const status = memberStatus(member);
  const role = ROLE_LOOK[member.role] ?? ROLE_LOOK.employee;
  const statusLook = STATUS_LOOK[status];
  const RoleIcon = role.icon;
  const StatusIcon = statusLook.icon;
  const hasMenu = can.write || (can.unlock && status === "locked");

  return (
    <li
      className={cn(
        "group flex flex-col gap-4 rounded-[24px] border bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-26px_rgba(15,23,42,0.5)]",
        status === "locked" ? "border-rose-200" : "border-zinc-200/70",
        busy && "pointer-events-none opacity-60",
      )}
      data-testid="team-member"
      data-status={status}
    >
      <div className="flex items-start gap-3.5">
        <MemberAvatar name={member.full_name} role={member.role} dimmed={status === "inactive"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[15px] font-semibold tracking-tight text-zinc-950">{member.full_name}</p>
            {self ? <span className="shrink-0 rounded-full bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-white">{t("you")}</span> : null}
          </div>
          <p className="truncate text-[12.5px] text-zinc-500" dir="ltr" style={{ textAlign: "start" }}>
            {member.email}
          </p>
        </div>
        {hasMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="-me-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                aria-label={t("menu.label", { name: member.full_name })}
                data-testid="team-member-menu"
              >
                <MoreHorizontal className="h-5 w-5" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {can.write ? (
                <>
                  <MenuItem icon={PencilLine} label={t("menu.edit")} onSelect={() => onAction("edit", member)} />
                  <MenuItem icon={KeyRound} label={t("menu.password")} onSelect={() => onAction("password", member)} />
                </>
              ) : null}
              {can.unlock && status === "locked" ? <MenuItem icon={LockOpen} label={t("menu.unlock")} onSelect={() => onAction("unlock", member)} /> : null}
              {can.write ? (
                <>
                  {!self ? (
                    <>
                      <MenuItem icon={LogOut} label={t("menu.signOut")} onSelect={() => onAction("signOut", member)} />
                      <DropdownMenuSeparator />
                      {member.is_active ? (
                        <MenuItem icon={Power} label={t("menu.deactivate")} destructive onSelect={() => onAction("deactivate", member)} />
                      ) : (
                        <MenuItem icon={Power} label={t("menu.activate")} onSelect={() => onAction("activate", member)} />
                      )}
                    </>
                  ) : null}
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {platform ? (
          <Pill tone="zinc">{member.company_name || "—"}</Pill>
        ) : (
          <Pill tone={role.tone}>
            <RoleIcon className="h-3.5 w-3.5" aria-hidden />
            {t(`roles.${member.role}`)}
          </Pill>
        )}
        <Pill tone={statusLook.tone} testId={status === "locked" ? "user-locked" : undefined}>
          <StatusIcon className="h-3.5 w-3.5" aria-hidden />
          {t(`status.${status}`)}
        </Pill>
        {member.mfa_enabled ? (
          <Pill tone="violet">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            {t("mfa")}
          </Pill>
        ) : null}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-zinc-100 pt-3 text-[12px] text-zinc-500">
        <span className="flex min-w-0 items-center gap-3">
          {teamName ? (
            <span className="flex min-w-0 items-center gap-1">
              <UsersRound className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
              <span className="truncate">{teamName}</span>
            </span>
          ) : null}
          {member.created_at ? (
            <span className="flex shrink-0 items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
              {t("joined", { date: formatDate(member.created_at, locale) })}
            </span>
          ) : null}
        </span>
        {can.unlock && status === "locked" ? (
          <Button type="button" size="sm" onClick={() => onAction("unlock", member)} data-testid="user-unlock">
            <LockOpen className="h-3.5 w-3.5" aria-hidden />
            {t("menu.unlock")}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function Pill({ tone, children, testId }: { tone: keyof typeof TONES; children: React.ReactNode; testId?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold", TONES[tone].soft)} data-testid={testId}>
      {children}
    </span>
  );
}

function MenuItem({ icon: Icon, label, destructive, onSelect }: { icon: typeof Power; label: string; destructive?: boolean; onSelect: () => void }) {
  return (
    <DropdownMenuItem onSelect={onSelect} className={cn("gap-2.5 py-2", destructive && "text-rose-600 focus:text-rose-700")}>
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </DropdownMenuItem>
  );
}
