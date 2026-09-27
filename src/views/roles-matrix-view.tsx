"use client";

import { useTranslations } from "next-intl";
import { fetchPermissionMatrix } from "@/entities/identity";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { ListScreen, QueryState } from "@/shared/ui";
import { Shield } from "lucide-react";
import { SurfacePanel } from "@/shared/ui/surface-panel";

export function RolesMatrixView() {
  const t = useTranslations("admin");
  const query = useApiQuery(() => fetchPermissionMatrix(), []);
  const roles = query.data?.roles ?? [];
  const matrix: Record<string, string[]> = query.data?.permissions ?? {};

  const allPerms = Array.from(new Set(Object.values(matrix).flat())).sort();

  return (
    <ListScreen title={t("rolesTitle")} description={t("rolesSubtitle")}>
      <QueryState
        loading={query.loading}
        error={query.error}
        errorTitle={t("loadError")}
        onRetry={() => void query.reload()}
        empty={roles.length === 0}
        emptyTitle={t("rolesEmpty")}
      >
        <SurfacePanel
          title={t("rolesTitle")}
          icon={Shield}
          accent="zinc"
          className="overflow-x-auto"
        >
          <div className="-mx-2 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50/80 text-[11px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("permission")}</th>
                {roles.map((r) => (
                  <th key={r} className="px-3 py-3 font-semibold capitalize">
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allPerms.map((p) => (
                <tr key={p} className="border-b border-zinc-50">
                  <td className="px-4 py-2.5 font-medium text-zinc-800">{p}</td>
                  {roles.map((r) => (
                    <td key={`${r}-${p}`} className="px-3 py-2.5 text-center">
                      {matrix[r]?.includes(p) ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                          ✓
                        </span>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </SurfacePanel>
      </QueryState>
    </ListScreen>
  );
}
