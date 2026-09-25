"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import {
  createAIRepository,
  fetchAISetupStrict,
  type AISetup,
} from "@/entities/ai";
import {
  createConversationRepository,
  type ChannelHealth,
} from "@/entities/conversation";
import { listBranches, listUsers } from "@/entities/identity/api";
import { useSessionUser } from "@/shared/api/session-context";
import { Button } from "@/shared/ui";
import { browserSetupDismissStore } from "../model/dismiss-store";
import {
  canSeeBranchSetupWizard,
  isBranchSetupComplete,
  shouldShowBranchSetupWizard,
  type BranchSetupFacts,
} from "../model/setup-status";
import { BranchSetupWizard } from "./branch-setup-wizard";

type Props = {
  forceOpen?: boolean;
  onForceConsumed?: () => void;
};

/**
 * GM-only dashboard host for first-run branch setup.
 * Soft gate: skip allowed; app remains usable.
 */
export function BranchSetupHost({ forceOpen = false, onForceConsumed }: Props) {
  const t = useTranslations("branchSetup");
  const user = useSessionUser();
  const dismissStore = useMemo(() => browserSetupDismissStore(), []);
  const aiRepo = useMemo(() => createAIRepository(), []);
  const inboxRepo = useMemo(
    () => createConversationRepository(user.branchId),
    [user.branchId],
  );

  const [aiSetup, setAiSetup] = useState<AISetup | null>(null);
  const [accounts, setAccounts] = useState<ChannelHealth[]>([]);
  const [orgFacts, setOrgFacts] = useState({
    companyNamed: false,
    staffRolesPresent: [] as string[],
  });
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [force, setForce] = useState(forceOpen);

  useEffect(() => {
    if (forceOpen) setForce(true);
  }, [forceOpen]);

  const reload = useCallback(async () => {
    const [ai, ch, users, branches] = await Promise.all([
      fetchAISetupStrict().then((s) => s ?? aiRepo.getSetup().catch(() => null)),
      inboxRepo.channelHealth().catch(() => [] as ChannelHealth[]),
      listUsers({ branchId: user.branchId }).catch(() => []),
      listBranches().catch(() => []),
    ]);
    setAiSetup(ai);
    setAccounts(ch);
    const roles = users
      .filter((u) => u.is_active && u.role !== "gm")
      .map((u) => u.role);
    const b =
      branches.find((x) => x.id === user.branchId) ?? branches[0] ?? null;
    setOrgFacts({
      companyNamed: Boolean(b?.name_en?.trim() && b?.code?.trim()),
      staffRolesPresent: roles,
    });
    setDismissed(dismissStore.isDismissed(user.branchId));
    setLoaded(true);
  }, [aiRepo, dismissStore, inboxRepo, user.branchId]);

  useEffect(() => {
    if (!canSeeBranchSetupWizard(user.role)) {
      setLoaded(true);
      return;
    }
    void reload();
  }, [user.role, reload]);

  const onOrgChange = useCallback(
    (f: Pick<BranchSetupFacts, "companyNamed" | "staffRolesPresent">) => {
      setOrgFacts({
        companyNamed: f.companyNamed,
        staffRolesPresent: [...f.staffRolesPresent],
      });
      dismissStore.clear(user.branchId);
      setDismissed(false);
    },
    [dismissStore, user.branchId],
  );

  if (!canSeeBranchSetupWizard(user.role) || !loaded) return null;

  const facts: BranchSetupFacts = {
    companyNamed: orgFacts.companyNamed,
    staffRolesPresent: orgFacts.staffRolesPresent,
    aiConfigured: Boolean(aiSetup?.configured),
    aiEnabled: Boolean(aiSetup?.enabled),
    channelsConnected: accounts.filter((a) => a.connected).length,
    dismissed,
    forceOpen: force,
  };

  const show = shouldShowBranchSetupWizard(facts);
  const complete = isBranchSetupComplete(facts);

  function skip() {
    dismissStore.dismiss(user.branchId);
    setDismissed(true);
    setForce(false);
    onForceConsumed?.();
  }

  function finished() {
    if (complete) {
      dismissStore.dismiss(user.branchId);
      setDismissed(true);
    } else {
      skip();
    }
    setForce(false);
    onForceConsumed?.();
  }

  if (show) {
    return (
      <div className="mb-6" data-testid="branch-setup-host">
        <BranchSetupWizard
          aiSetup={aiSetup}
          onAiChange={(s) => {
            setAiSetup(s);
            dismissStore.clear(user.branchId);
            setDismissed(false);
          }}
          accounts={accounts}
          onAccountsChange={setAccounts}
          orgFacts={orgFacts}
          onOrgChange={onOrgChange}
          onSkip={skip}
          onFinished={finished}
        />
      </div>
    );
  }

  if (!complete) {
    return (
      <div
        className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50/80 to-emerald-50/50 px-4 py-3"
        data-testid="branch-setup-resume"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-700">
            <Building2 className="h-5 w-5" strokeWidth={1.7} />
          </span>
          <p className="text-sm font-medium text-zinc-700">{t("resumeHint")}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            dismissStore.clear(user.branchId);
            setDismissed(false);
            setForce(true);
          }}
          data-testid="branch-setup-resume-btn"
        >
          {t("resume")}
        </Button>
      </div>
    );
  }

  return null;
}
