"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useCan, useViewer } from "@/entities/viewer";
import {
  getScopedBranchId,
  setScopedBranchId,
} from "../model/scope-store";
import { listBranches, type Branch } from "@/entities/identity";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";

export function BranchScopeSelect() {
  const t = useTranslations("admin");
  const { user, scope } = useViewer();
  const canReadBranches = useCan("branches.read");
  const visible = canReadBranches && scope !== "own";
  const [branches, setBranches] = useState<Branch[]>([]);
  const [value, setValue] = useState(user.branchId);

  useEffect(() => {
    setValue(getScopedBranchId(user.branchId));
    if (!visible) return;
    void listBranches()
      .then(setBranches)
      .catch(() =>
        setBranches([
          {
            id: user.branchId,
            code: "HQ",
            name_en: "Head Office",
            name_ar: "",
            is_active: true,
          },
        ]),
      );
  }, [user.branchId, visible]);

  if (!visible) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-zinc-400 sm:inline">
        {t("branch")}
      </span>
      <Select
        value={value}
        onValueChange={(v) => {
          setValue(v);
          setScopedBranchId(v);
        }}
      >
        <SelectTrigger className="h-9 w-[160px] rounded-xl border-zinc-200 bg-white text-xs">
          <SelectValue placeholder={t("branch")} />
        </SelectTrigger>
        <SelectContent>
          {branches
            .filter((b) => Boolean(b.id))
            .map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.code} — {b.name_en}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
