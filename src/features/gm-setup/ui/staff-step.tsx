"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Eye, EyeOff, Plus, RefreshCw, Users } from "lucide-react";
import type { SetupBranch, SetupOverview, SetupRepository } from "@/entities/setup";
import { createUser, listUsers, type ApiUser } from "@/entities/identity";
import { useActiveBranch } from "@/features/branch-scope";
import { isApiError } from "@/shared/api/api-error";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { cn } from "@/shared/lib/cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  useMutationFeedback,
} from "@/shared/ui";
import {
  STAFF_ROLES,
  generatePassword,
  initials,
  passwordIssue,
  type PasswordIssue,
  type StaffRole,
} from "../model/flow";
import { ChoiceGrid, GlassField, GlassGroup, GlassInput, PillButton, StepHero } from "./glass";
import { StepFooter } from "./step-footer";

const ROLE_TINTS: Record<string, string> = {
  manager: "from-sky-400 to-blue-600",
  employee: "from-amber-400 to-orange-500",
  finance: "from-emerald-400 to-teal-600",
  operations: "from-violet-400 to-fuchsia-600",
};

type Props = {
  overview: SetupOverview;
  repository: SetupRepository;
  onChange: (next: SetupOverview) => void;
  onBack: (() => void) | null;
  onDone: (next: SetupOverview) => void;
};

export function StaffStep({ overview, repository, onChange, onBack, onDone }: Props) {
  const t = useTranslations("setup.staff");
  const tr = useTranslations("setup.roles");
  const active = useActiveBranch();
  const feedback = useMutationFeedback();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const branches = overview.branches;
  const multiBranch = branches.length > 1;
  const branchName = (id: string) => branches.find((b) => b.id === id)?.nameEn ?? "";

  const users = useApiQuery(
    async () =>
      (await listUsers({ allBranches: true, limit: 100 })).filter((u) => u.role !== "gm" && u.role !== "admin"),
    [],
  );
  const profiles = users.data ?? [];

  async function created(user: ApiUser) {
    users.setData((prev) => [...(prev ?? []), user]);
    try {
      onChange(await repository.get());
    } catch {
      /* the next step transition refreshes progress anyway */
    }
  }

  async function next() {
    setBusy(true);
    try {
      onDone(await repository.advance("staff"));
    } catch (err) {
      feedback.error(err, t("advanceError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <StepHero icon={Users} tint="staff" title={t("title")} subtitle={t("subtitle")} />

      <GlassGroup title={t("listTitle")} footer={t("laterHint")}>
        <div className="grid grid-cols-3 gap-3 p-3">
          {profiles.map((u) => (
            <div
              key={u.id}
              className={cn(
                "flex flex-col items-center gap-2 rounded-[16px] bg-white/[0.07] px-2 py-4 text-center shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.1)]",
                !u.is_active && "opacity-50",
              )}
              data-testid="setup-profile"
            >
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-b text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]",
                  ROLE_TINTS[u.role] ?? "from-zinc-400 to-zinc-600",
                )}
                aria-hidden
              >
                {initials(u.full_name)}
              </span>
              <span className="w-full min-w-0">
                <span className="block truncate text-[13px] font-semibold text-white">{u.full_name}</span>
                <span className="block truncate text-[11px] font-medium text-white/55">
                  {STAFF_ROLES.includes(u.role as StaffRole) ? tr(u.role as StaffRole) : u.role}
                </span>
                {multiBranch ? (
                  <span className="block truncate text-[10px] text-white/40">{branchName(u.branch_id)}</span>
                ) : null}
              </span>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex min-h-[124px] flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-white/20 px-2 py-4 text-white/55 transition-all duration-200 hover:border-white/35 hover:bg-white/[0.08] hover:text-white/90 active:scale-[0.98]"
            data-testid="setup-add-profile"
          >
            <span className="glass-pill flex h-12 w-12 items-center justify-center rounded-full">
              <Plus className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="text-[12px] font-semibold">{t("add")}</span>
          </button>
        </div>
        {users.loading && profiles.length === 0 ? (
          <p className="px-4 py-3 text-center text-[12px] text-white/55">{t("loading")}</p>
        ) : null}
      </GlassGroup>

      <StepFooter
        onBack={onBack}
        primaryLabel={profiles.length > 0 ? t("continue") : t("skip")}
        onPrimary={() => void next()}
        busy={busy}
      />

      <NewProfileSheet
        open={sheetOpen}
        branches={branches}
        defaultBranchId={
          branches.find((b) => b.id === active?.id)?.id ??
          branches.find((b) => b.kind === "main_center")?.id ??
          branches[0]?.id ??
          ""
        }
        onOpenChange={setSheetOpen}
        onCreated={(u) => void created(u)}
      />
    </div>
  );
}

type PasswordMode = "generate" | "manual";

function NewProfileSheet({
  open,
  branches,
  defaultBranchId,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  branches: SetupBranch[];
  defaultBranchId: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (user: ApiUser) => void;
}) {
  const t = useTranslations("setup.staff.sheet");
  const tr = useTranslations("setup.roles");
  const feedback = useMutationFeedback();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("employee");
  const [branchId, setBranchId] = useState(defaultBranchId);
  const [mode, setMode] = useState<PasswordMode>("generate");
  const [generated, setGenerated] = useState(() => generatePassword());
  const [manual, setManual] = useState("");
  const [reveal, setReveal] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: PasswordIssue; branch?: string }>({});
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const password = mode === "generate" ? generated : manual;

  function reset() {
    setName("");
    setEmail("");
    setRole("employee");
    setBranchId(defaultBranchId);
    setMode("generate");
    setGenerated(generatePassword());
    setManual("");
    setReveal(false);
    setErrors({});
    setCopied(false);
  }

  function close(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${email.trim()}\n${password}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be blocked; the password stays visible */
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (name.trim().length < 2) nextErrors.name = t("errors.name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = t("errors.email");
    const issue = passwordIssue(password);
    if (issue) nextErrors.password = issue;
    if (!branches.some((b) => b.id === branchId)) nextErrors.branch = t("errors.branch");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    try {
      const user = await createUser({
        email: email.trim().toLowerCase(),
        password,
        full_name: name.trim(),
        role,
        branch_id: branchId,
      });
      feedback.success(t("created", { name: user.full_name }));
      onCreated(user);
      close(false);
    } catch (err) {
      if (isApiError(err) && (err.status === 409 || err.fieldErrors?.email)) {
        setErrors({ email: t("errors.emailTaken") });
      } else if (isApiError(err) && err.fieldErrors?.branch_id) {
        setErrors({ branch: t("errors.branch") });
      } else {
        feedback.error(err, t("error"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="setup-night max-w-[440px] border-white/15 bg-[#0d1328]/90 text-white backdrop-blur-2xl [&>button:last-child]:text-white/55 [&>button:last-child]:hover:bg-white/10 [&>button:last-child]:hover:text-white" data-testid="setup-profile-sheet">
        <DialogHeader className="items-center text-center">
          <span
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b text-[20px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_24px_-12px_rgba(15,23,42,0.55)] transition-colors",
              ROLE_TINTS[role],
            )}
            aria-hidden
          >
            {name.trim() ? initials(name) : <Users className="h-7 w-7" strokeWidth={1.75} />}
          </span>
          <DialogTitle className="text-[18px] text-white">{t("title")}</DialogTitle>
          <DialogDescription className="text-[13px] text-white/55">{t("subtitle")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void submit(e)} className="space-y-5" noValidate>
          <GlassGroup>
            <GlassField id="profile-name" label={t("name")} error={errors.name}>
              <GlassInput
                id="profile-name"
                value={name}
                invalid={Boolean(errors.name)}
                autoComplete="off"
                placeholder={t("namePlaceholder")}
                onChange={(e) => setName(e.target.value)}
                data-testid="profile-name"
              />
            </GlassField>
            <GlassField id="profile-email" label={t("email")} error={errors.email}>
              <GlassInput
                id="profile-email"
                type="email"
                inputMode="email"
                dir="ltr"
                value={email}
                invalid={Boolean(errors.email)}
                autoComplete="off"
                placeholder="name@company.com"
                onChange={(e) => setEmail(e.target.value)}
                data-testid="profile-email"
              />
            </GlassField>
          </GlassGroup>

          <GlassGroup title={t("role")}>
            <div className="p-2">
              <ChoiceGrid
                label={t("role")}
                columns={4}
                value={role}
                onChange={setRole}
                options={STAFF_ROLES.map((r) => ({ value: r, label: tr(r) }))}
              />
            </div>
          </GlassGroup>

          {branches.length > 1 ? (
            <GlassGroup title={t("branch")}>
              <GlassField id="profile-branch" label={t("branch")} error={errors.branch}>
                <select
                  id="profile-branch"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="h-[46px] w-full cursor-pointer appearance-none bg-transparent text-[14px] text-white outline-none"
                  data-testid="profile-branch"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nameEn}
                      {b.kind === "main_center" ? ` · ${t("mainCenter")}` : ""}
                    </option>
                  ))}
                </select>
              </GlassField>
            </GlassGroup>
          ) : null}

          <GlassGroup
            title={t("password")}
            footer={errors.password ? undefined : mode === "generate" ? t("passwordHint") : t("manualHint")}
          >
            <div className="p-2">
              <ChoiceGrid
                label={t("password")}
                columns={2}
                value={mode}
                onChange={(m) => {
                  setMode(m);
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                options={[
                  { value: "generate", label: t("modeGenerate") },
                  { value: "manual", label: t("modeManual") },
                ]}
              />
            </div>
            {mode === "generate" ? (
              <div className="flex items-center gap-2 px-4">
                <code className="h-[46px] min-w-0 flex-1 truncate font-mono text-[14px] leading-[46px] tracking-wide text-white" dir="ltr" data-testid="profile-password">
                  {generated}
                </code>
                <button
                  type="button"
                  onClick={() => setGenerated(generatePassword())}
                  className="glass-pill flex h-8 w-8 items-center justify-center rounded-full text-white/65 hover:text-white"
                  aria-label={t("regenerate")}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void copy()}
                  className="glass-pill flex h-8 w-8 items-center justify-center rounded-full text-white/65 hover:text-white"
                  aria-label={t("copy")}
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4">
                <GlassInput
                  id="profile-password-manual"
                  type={reveal ? "text" : "password"}
                  dir="ltr"
                  value={manual}
                  invalid={Boolean(errors.password)}
                  autoComplete="new-password"
                  placeholder={t("manualPlaceholder")}
                  aria-label={t("password")}
                  onChange={(e) => {
                    setManual(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  data-testid="profile-password-manual"
                />
                <button
                  type="button"
                  onClick={() => setReveal((v) => !v)}
                  className="glass-pill flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/65 hover:text-white"
                  aria-label={reveal ? t("hidePassword") : t("showPassword")}
                >
                  {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
            {errors.password ? (
              <p className="px-4 pb-2.5 text-[11px] font-medium text-rose-300" role="alert">
                {t(`errors.password.${errors.password}`)}
              </p>
            ) : null}
          </GlassGroup>

          <div className="grid grid-cols-2 gap-3">
            <PillButton variant="glass" onClick={() => close(false)} disabled={busy}>
              {t("cancel")}
            </PillButton>
            <PillButton type="submit" disabled={busy} data-testid="profile-submit">
              {busy ? t("creating") : t("create")}
            </PillButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
