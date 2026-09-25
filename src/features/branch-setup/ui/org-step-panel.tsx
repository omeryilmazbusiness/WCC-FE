"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Briefcase,
  Building2,
  Check,
  Landmark,
  Truck,
  UserRound,
} from "lucide-react";
import {
  createUser,
  listBranches,
  listUsers,
  updateBranch,
  type ApiUser,
  type Branch,
} from "@/entities/identity/api";
import { useSessionUser } from "@/shared/api/session-context";
import { cn } from "@/shared/lib/cn";
import { useToast } from "@/shared/ui";
import {
  ORG_ROLE_DEFAULTS,
  ORG_SEED_ROLES,
  missingOrgRoles,
  type OrgSeedRole,
} from "../model/setup-status";

type Props = {
  onChanged: (facts: {
    companyNamed: boolean;
    staffRolesPresent: string[];
  }) => void;
  onContinueToAi: () => void;
};

const ROLE_ICON: Record<OrgSeedRole, typeof Briefcase> = {
  manager: Briefcase,
  employee: UserRound,
  finance: Landmark,
  operations: Truck,
};

type Draft = { full_name: string; email: string; password: string };

function draftFor(role: OrgSeedRole): Draft {
  const d = ORG_ROLE_DEFAULTS[role];
  return { full_name: d.fullName, email: d.email, password: "" };
}

const fieldClass =
  "h-12 w-full bg-transparent px-4 text-[16px] text-zinc-900 outline-none placeholder:text-zinc-300";

export function OrgStepPanel({ onChanged, onContinueToAi }: Props) {
  const t = useTranslations("branchSetup");
  const user = useSessionUser();
  const { push } = useToast();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [code, setCode] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [phase, setPhase] = useState<"staff" | "company">("staff");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const staffRoles = useMemo(
    () =>
      users
        .filter((u) => u.is_active && u.role !== "gm")
        .map((u) => u.role),
    [users],
  );

  const missing = useMemo(() => missingOrgRoles(staffRoles), [staffRoles]);
  const currentRole: OrgSeedRole | null = missing[0] ?? null;
  const companyNamed = Boolean(nameEn.trim() && code.trim());
  const doneCount = ORG_SEED_ROLES.length - missing.length;

  useEffect(() => {
    onChanged({ companyNamed, staffRolesPresent: staffRoles });
  }, [companyNamed, staffRoles, onChanged]);

  useEffect(() => {
    if (missing.length === 0 && phase === "staff") setPhase("company");
  }, [missing.length, phase]);

  useEffect(() => {
    if (currentRole) setDraft(draftFor(currentRole));
    else setDraft(null);
  }, [currentRole]);

  async function reload() {
    const [branches, list] = await Promise.all([
      listBranches(),
      listUsers({ branchId: user.branchId }),
    ]);
    const b =
      branches.find((x) => x.id === user.branchId) ?? branches[0] ?? null;
    setBranch(b);
    if (b) {
      setCode(b.code);
      setNameEn(b.name_en);
      setNameAr(b.name_ar);
    }
    setUsers(list);
  }

  useEffect(() => {
    void reload().catch(() => {
      push({ title: t("orgLoadError"), tone: "error" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.branchId]);

  async function createCurrent() {
    if (!currentRole || !draft) return;
    if (!draft.full_name.trim() || !draft.email.trim() || !draft.password.trim()) {
      push({ title: t("staffRequired"), tone: "error" });
      return;
    }
    setBusy(true);
    try {
      await createUser({
        email: draft.email.trim().toLowerCase(),
        password: draft.password,
        full_name: draft.full_name.trim(),
        role: currentRole,
        branch_id: user.branchId,
      });
      push({
        title: t("staffCreated", { role: t(`roles.${currentRole}`) }),
        tone: "success",
      });
      await reload();
    } catch {
      push({ title: t("staffCreateError"), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function saveAndGoAi() {
    if (!branch) return;
    if (!companyNamed) {
      push({ title: t("companyRequired"), tone: "error" });
      return;
    }
    if (missing.length > 0) {
      push({ title: t("staffIncomplete"), tone: "error" });
      setPhase("staff");
      return;
    }
    setBusy(true);
    try {
      const updated = await updateBranch(branch.id, {
        code: code.trim(),
        name_en: nameEn.trim(),
        name_ar: nameAr.trim(),
      });
      setBranch(updated);
      onChanged({ companyNamed: true, staffRolesPresent: staffRoles });
      push({ title: t("companySaved"), tone: "success" });
      onContinueToAi();
    } catch {
      push({ title: t("companySaveError"), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7" data-testid="org-step-panel">
      {/* Role progress — soft dots */}
      <div className="flex justify-center gap-5">
        {ORG_SEED_ROLES.map((role) => {
          const done = !missing.includes(role);
          const active = currentRole === role && phase === "staff";
          const Icon = ROLE_ICON[role];
          return (
            <span key={role} className="flex items-center justify-center">
              {done ? (
                <Check className="h-5 w-5 text-emerald-500" strokeWidth={2.25} />
              ) : (
                <Icon
                  className={cn(
                    "h-5 w-5",
                    active ? "text-zinc-800" : "text-zinc-300",
                  )}
                  strokeWidth={1.5}
                />
              )}
            </span>
          );
        })}
      </div>

      {phase === "staff" && currentRole && draft ? (
        <section data-testid={`org-role-${currentRole}`}>
          <div className="text-center">
            {(() => {
              const Icon = ROLE_ICON[currentRole];
              return (
                <Icon
                  className="mx-auto h-16 w-16 text-zinc-800"
                  strokeWidth={1.2}
                />
              );
            })()}
            <p className="mt-4 text-[12px] font-medium uppercase tracking-wider text-zinc-400">
              {t("staffStep", {
                current: doneCount + 1,
                total: ORG_SEED_ROLES.length,
              })}
            </p>
            <h3 className="mt-1.5 text-[20px] font-semibold tracking-tight text-zinc-900">
              {t(`roles.${currentRole}`)}
            </h3>
            <p className="mx-auto mt-1.5 max-w-[260px] text-[14px] leading-relaxed text-zinc-400">
              {t("staffOneByOne")}
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-100">
            <label className="block border-b border-zinc-100">
              <span className="sr-only">{t("staffName")}</span>
              <input
                className={fieldClass}
                value={draft.full_name}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, full_name: e.target.value } : d))
                }
                placeholder={t("staffName")}
              />
            </label>
            <label className="block border-b border-zinc-100">
              <span className="sr-only">{t("staffEmail")}</span>
              <input
                type="email"
                className={fieldClass}
                value={draft.email}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, email: e.target.value } : d))
                }
                placeholder={t("staffEmail")}
              />
            </label>
            <label className="block">
              <span className="sr-only">{t("staffPassword")}</span>
              <input
                type="password"
                autoComplete="new-password"
                className={fieldClass}
                value={draft.password}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, password: e.target.value } : d))
                }
                placeholder={t("staffPasswordPh")}
              />
            </label>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void createCurrent()}
            className="mt-5 h-12 w-full rounded-full bg-zinc-900 text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
          >
            {busy ? t("saving") : t("createStaff")}
          </button>
        </section>
      ) : null}

      {phase === "company" || missing.length === 0 ? (
        <section data-testid="org-company">
          <div className="text-center">
            <Building2
              className="mx-auto h-16 w-16 text-zinc-800"
              strokeWidth={1.2}
            />
            <h3 className="mt-4 text-[20px] font-semibold tracking-tight text-zinc-900">
              {t("companyTitle")}
            </h3>
            <p className="mx-auto mt-1.5 max-w-[280px] text-[14px] leading-relaxed text-zinc-400">
              {t("companyBody")}
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-100">
            <label className="block border-b border-zinc-100">
              <span className="sr-only">{t("companyCode")}</span>
              <input
                className={fieldClass}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t("companyCode")}
              />
            </label>
            <label className="block border-b border-zinc-100">
              <span className="sr-only">{t("companyNameEn")}</span>
              <input
                className={fieldClass}
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder={t("companyNameEnPh")}
              />
            </label>
            <label className="block">
              <span className="sr-only">{t("companyNameAr")}</span>
              <input
                className={fieldClass}
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder={t("companyNameArPh")}
                dir="rtl"
              />
            </label>
          </div>

          <button
            type="button"
            disabled={busy || !companyNamed}
            onClick={() => void saveAndGoAi()}
            data-testid="org-complete"
            className="mt-5 h-12 w-full rounded-full bg-zinc-900 text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
          >
            {busy ? t("saving") : t("orgComplete")}
          </button>
        </section>
      ) : null}
    </div>
  );
}
