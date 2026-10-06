"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { createUser, revokeUserSessions, unlockUser, updateUser, type ApiUser } from "@/entities/identity";
import { useMutationFeedback } from "@/shared/ui";

export type MemberInput = Parameters<typeof createUser>[0];
export type MemberPatch = Parameters<typeof updateUser>[1];

/** Writes on team members; `busyId` is the member being changed. Every success reloads the list. */
export function useMemberActions(onChanged: () => void) {
  const t = useTranslations("team");
  const feedback = useMutationFeedback();
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = useCallback(
    async (id: string, action: () => Promise<unknown>, success: string, failure: string) => {
      setBusyId(id);
      try {
        await action();
        feedback.success(success);
        onChanged();
        return true;
      } catch (err) {
        feedback.error(err, failure);
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [feedback, onChanged],
  );

  return {
    busyId,
    create: (input: MemberInput) => run("new", () => createUser(input), t("toast.created", { name: input.full_name }), t("toast.createError")),
    update: (user: ApiUser, patch: MemberPatch) =>
      run(user.id, () => updateUser(user.id, patch), t("toast.updated", { name: user.full_name }), t("toast.updateError")),
    setActive: (user: ApiUser, active: boolean) =>
      run(
        user.id,
        () => updateUser(user.id, { is_active: active }),
        t(active ? "toast.activated" : "toast.deactivated", { name: user.full_name }),
        t("toast.updateError"),
      ),
    resetPassword: (user: ApiUser, password: string) =>
      run(
        user.id,
        async () => {
          await updateUser(user.id, { password });
          // A password update alone keeps existing sessions alive; end them so a leaked password stops working.
          await revokeUserSessions(user.id);
        },
        t("toast.passwordReset", { name: user.full_name }),
        t("toast.updateError"),
      ),
    unlock: (user: ApiUser) => run(user.id, () => unlockUser(user.id), t("toast.unlocked", { name: user.full_name }), t("toast.unlockError")),
  };
}

export type MemberActions = ReturnType<typeof useMemberActions>;
