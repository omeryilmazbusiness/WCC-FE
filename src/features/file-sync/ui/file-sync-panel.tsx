"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, CloudUpload } from "lucide-react";
import {
  createFileSyncRepository,
  FILE_SYNC_CONFLICT_POLICIES,
  FILE_SYNC_PROVIDERS,
  FILE_SYNC_SOURCES,
  type FileSyncConflictPolicy,
  type FileSyncConnection,
  type FileSyncProvider,
  type FileSyncRun,
  type FileSyncSourceOfTruth,
} from "@/entities/filesync";
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from "@/shared/ui";

export function FileSyncPanel() {
  const t = useTranslations("fileSync");
  const { push } = useToast();
  const repo = useMemo(() => createFileSyncRepository(), []);

  const [connections, setConnections] = useState<FileSyncConnection[]>([]);
  const [runs, setRuns] = useState<FileSyncRun[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);

  const [provider, setProvider] = useState<FileSyncProvider>("onedrive");
  const [displayName, setDisplayName] = useState("");
  const [remotePath, setRemotePath] = useState("");
  const [entityType, setEntityType] = useState("customers");
  const [sourceOfTruth, setSourceOfTruth] =
    useState<FileSyncSourceOfTruth>("platform");
  const [conflictPolicy, setConflictPolicy] =
    useState<FileSyncConflictPolicy>("flag");

  const refresh = useCallback(async () => {
    const list = await repo.listConnections();
    setConnections(list);
    const sid = selectedId || list[0]?.id || "";
    if (sid && sid !== selectedId) setSelectedId(sid);
    if (sid) setRuns(await repo.listRuns(sid));
    else setRuns([]);
  }, [repo, selectedId]);

  useEffect(() => {
    void refresh().catch(() => push({ title: t("loadError"), tone: "error" }));
  }, [refresh, push, t]);

  useEffect(() => {
    if (!selectedId) {
      setRuns([]);
      return;
    }
    void repo
      .listRuns(selectedId)
      .then(setRuns)
      .catch(() => setRuns([]));
  }, [selectedId, repo]);

  async function run(fn: () => Promise<unknown>, okKey: "saved" | "synced" | "connected") {
    setBusy(true);
    try {
      await fn();
      await refresh();
      push({ title: t(okKey), tone: "success" });
    } catch (e) {
      push({
        title: t("actionError"),
        description: e instanceof Error ? e.message : undefined,
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  function statusTone(status: string) {
    if (status === "connected" || status === "completed")
      return "bg-emerald-50 text-emerald-800";
    if (status === "error" || status === "failed")
      return "bg-rose-50 text-rose-800";
    if (status === "syncing" || status === "running")
      return "bg-sky-50 text-sky-800";
    return "bg-zinc-100 text-zinc-600";
  }

  return (
    <div className="space-y-4" data-testid="file-sync-panel">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[14px] font-semibold text-zinc-900">{t("title")}</p>
          <p className="text-[12px] text-zinc-400">{t("subtitle")}</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() =>
            void refresh().catch(() =>
              push({ title: t("loadError"), tone: "error" }),
            )
          }
        >
          <RefreshCw className="me-1.5 h-3.5 w-3.5" />
          {t("refresh")}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-2 rounded-xl bg-zinc-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            {t("newConnection")}
          </p>
          <Select
            value={provider}
            onValueChange={(v) => setProvider(v as FileSyncProvider)}
          >
            <SelectTrigger className="h-8 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILE_SYNC_PROVIDERS.map((p) => (
                <SelectItem key={p} value={p}>
                  {t(`provider.${p}` as "provider.onedrive")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="h-8 bg-white"
            placeholder={t("displayName")}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <Input
            className="h-8 bg-white font-mono text-[12px]"
            placeholder={t("remotePath")}
            value={remotePath}
            onChange={(e) => setRemotePath(e.target.value)}
          />
          <Input
            className="h-8 bg-white"
            placeholder={t("entityType")}
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={sourceOfTruth}
              onValueChange={(v) =>
                setSourceOfTruth(v as FileSyncSourceOfTruth)
              }
            >
              <SelectTrigger className="h-8 bg-white">
                <SelectValue placeholder={t("sourceOfTruth")} />
              </SelectTrigger>
              <SelectContent>
                {FILE_SYNC_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`source.${s}` as "source.platform")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={conflictPolicy}
              onValueChange={(v) =>
                setConflictPolicy(v as FileSyncConflictPolicy)
              }
            >
              <SelectTrigger className="h-8 bg-white">
                <SelectValue placeholder={t("conflictPolicy")} />
              </SelectTrigger>
              <SelectContent>
                {FILE_SYNC_CONFLICT_POLICIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {t(`conflict.${p}` as "conflict.flag")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            className="w-full"
            disabled={busy || !displayName.trim() || !remotePath.trim()}
            onClick={() =>
              void run(async () => {
                const c = await repo.createConnection({
                  provider,
                  displayName: displayName.trim(),
                  remotePath: remotePath.trim(),
                  entityType: entityType.trim() || "customers",
                  sourceOfTruth,
                  conflictPolicy,
                });
                setDisplayName("");
                setRemotePath("");
                setSelectedId(c.id);
              }, "saved")
            }
          >
            <CloudUpload className="me-1.5 h-3.5 w-3.5" />
            {t("create")}
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            {t("connections")}
          </p>
          {connections.length === 0 ? (
            <EmptyState title={t("empty")} />
          ) : (
            <ul className="max-h-[280px] space-y-1 overflow-y-auto">
              {connections.map((c) => {
                const on = selectedId === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start transition ${
                        on
                          ? "bg-zinc-950 text-white"
                          : "bg-zinc-50 text-zinc-800 hover:bg-zinc-100"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold">
                          {c.displayName}
                        </p>
                        <p
                          className={`truncate text-[11px] ${
                            on ? "text-zinc-400" : "text-zinc-400"
                          }`}
                        >
                          {t(`provider.${c.provider}` as "provider.onedrive")} ·{" "}
                          {c.remotePath}
                        </p>
                      </div>
                      <Badge className={statusTone(c.status)}>
                        {t(`status.${c.status}` as "status.connected")}
                      </Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {selectedId ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void run(() => repo.connect(selectedId), "connected")
                }
              >
                {t("connect")}
              </Button>
              <Button
                size="sm"
                disabled={busy}
                onClick={() => void run(() => repo.sync(selectedId), "synced")}
              >
                {t("syncNow")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await repo.deleteConnection(selectedId);
                    setSelectedId("");
                  }, "saved")
                }
              >
                {t("remove")}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          {t("recentRuns")}
        </p>
        {runs.length === 0 ? (
          <p className="text-[13px] text-zinc-500">{t("runsEmpty")}</p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-100">
            {runs.slice(0, 8).map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-2 px-3 py-2 text-[13px]"
              >
                <Badge className={statusTone(r.status)}>
                  {t(`runStatus.${r.status}` as "runStatus.completed")}
                </Badge>
                <span className="text-zinc-500">
                  {t("runStats", {
                    scanned: r.filesScanned,
                    changed: r.filesChanged,
                    conflicts: r.conflicts,
                  })}
                </span>
                <span className="ms-auto text-[11px] tabular-nums text-zinc-400">
                  {r.startedAt
                    ? new Date(r.startedAt).toLocaleString()
                    : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
