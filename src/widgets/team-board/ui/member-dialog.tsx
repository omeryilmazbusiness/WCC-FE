"use client";

import { useState } from "react";
import { Loader2, Mail, UserRound, UsersRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { isEmail, passwordIssues, type ApiUser, type Team } from "@/entities/identity";
import type { AppRole } from "@/shared/config/routes";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  IconInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import type { MemberInput, MemberPatch } from "../model/use-member-actions";
import { PasswordField } from "./password-field";
import { RolePicker } from "./role-picker";

const NO_TEAM = "__none__";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing; absent when adding a member. */
  member?: ApiUser;
  roles: readonly AppRole[];
  teams: readonly Team[];
  branchId: string;
  /** Own account: role is read-only (the API refuses self role changes). */
  self?: boolean;
  /** Platform operators only edit GM accounts, so the role is fixed. */
  lockRole?: boolean;
  busy: boolean;
  onCreate: (input: MemberInput) => Promise<boolean>;
  onUpdate: (member: ApiUser, patch: MemberPatch) => Promise<boolean>;
};

/** Add a member or edit name, role and team of an existing one. */
export function MemberDialog({ open, onOpenChange, member, roles, teams, branchId, self, lockRole, busy, onCreate, onUpdate }: Props) {
  const t = useTranslations("team");
  const locale = useLocale();
  const editing = Boolean(member);
  const [name, setName] = useState(member?.full_name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [role, setRole] = useState<AppRole>(member?.role ?? "employee");
  const [team, setTeam] = useState(member?.team_id ?? NO_TEAM);
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);

  const nameOk = name.trim().length > 1;
  const emailOk = editing || isEmail(email);
  const passwordOk = editing || passwordIssues(password).length === 0;
  const valid = nameOk && emailOk && passwordOk;
  const pickable = roles.includes(role) ? roles : [role, ...roles];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    const teamId = team === NO_TEAM ? undefined : team;
    const ok = member
      ? await onUpdate(member, {
          ...(name.trim() !== member.full_name ? { full_name: name.trim() } : {}),
          ...(!self && !lockRole && role !== member.role ? { role } : {}),
          ...(teamId !== (member.team_id ?? undefined) ? (teamId ? { team_id: teamId } : { clear_team: true }) : {}),
        })
      : await onCreate({ full_name: name.trim(), email: email.trim(), password, role, branch_id: branchId, ...(teamId ? { team_id: teamId } : {}) });
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? t("form.editTitle", { name: member?.full_name ?? "" }) : t("form.addTitle")}</DialogTitle>
          <DialogDescription>{editing ? t("form.editHint") : t("form.addHint")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="space-y-5" noValidate data-testid="team-member-form">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("form.name")} error={touched && !nameOk ? t("form.nameError") : undefined}>
              <IconInput icon={UserRound} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" maxLength={120} aria-label={t("form.name")} data-testid="team-name" />
            </Field>
            <Field label={t("form.email")} error={touched && !emailOk ? t("form.emailError") : undefined}>
              <IconInput
                icon={Mail}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={editing}
                autoComplete="off"
                dir="ltr"
                aria-label={t("form.email")}
                data-testid="team-email"
              />
            </Field>
          </div>

          {!lockRole ? (
            <div className="space-y-2">
              <p className="text-[12.5px] font-semibold text-zinc-700">{t("form.role")}</p>
              <RolePicker roles={pickable} value={role} onChange={setRole} disabled={self} />
              {self ? <p className="text-[12px] text-zinc-500">{t("form.selfRole")}</p> : null}
            </div>
          ) : null}

          {teams.length > 0 ? (
            <Field label={t("form.team")}>
              <Select value={team} onValueChange={setTeam}>
                <SelectTrigger className="h-12" aria-label={t("form.team")}>
                  <span className="flex items-center gap-2.5">
                    <UsersRound className="h-[18px] w-[18px] text-zinc-400" aria-hidden />
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TEAM}>{t("form.noTeam")}</SelectItem>
                  {teams.map((x) => (
                    <SelectItem key={x.id} value={x.id}>
                      {(locale === "ar" && x.name_ar) || x.name_en || x.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}

          {!editing ? (
            <div className="space-y-1.5">
              <PasswordField label={t("form.password")} value={password} onChange={setPassword} />
              <p className="text-[12px] text-zinc-500">{t("form.passwordHint")}</p>
              {touched && !passwordOk ? <p className="text-[12px] font-medium text-rose-600">{t("form.passwordError")}</p> : null}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
              {t("form.cancel")}
            </Button>
            <Button type="submit" disabled={busy} data-testid="team-submit">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {editing ? t("form.save") : t("form.add")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[12.5px] font-semibold text-zinc-700">{label}</p>
      {children}
      {error ? <p className="text-[12px] font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
