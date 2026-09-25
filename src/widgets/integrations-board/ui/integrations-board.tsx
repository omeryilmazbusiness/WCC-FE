"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Plug, RefreshCw } from "lucide-react";
import {
  createExtIntRepository,
  type ExtIntCatalogItem,
  type ExtIntProvider,
  type ExtIntStatus,
  type ExternalIntegration,
} from "@/entities/extint";
import {
  Badge,
  Button,
  EmptyState,
  Input,
  PageHeader,
  Screen,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

function statusTone(status: ExtIntStatus) {
  if (status === "healthy") return "bg-emerald-50 text-emerald-800";
  if (status === "degraded") return "bg-amber-50 text-amber-900";
  if (status === "error") return "bg-rose-50 text-rose-800";
  if (status === "disabled") return "bg-zinc-100 text-zinc-500";
  return "bg-sky-50 text-sky-800";
}

export function IntegrationsBoard() {
  const t = useTranslations("integrations");
  const { push } = useToast();
  const repo = useMemo(() => createExtIntRepository(), []);

  const [catalog, setCatalog] = useState<ExtIntCatalogItem[]>([]);
  const [items, setItems] = useState<ExternalIntegration[]>([]);
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<ExtIntProvider>("whatsapp");
  const [displayName, setDisplayName] = useState("");
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [editConfigId, setEditConfigId] = useState<string | null>(null);
  const [editConfig, setEditConfig] = useState<Record<string, string>>({});

  const selectedCatalog = useMemo(
    () => catalog.find((c) => c.provider === provider) ?? null,
    [catalog, provider],
  );
  const schemaFields = selectedCatalog?.configSchema ?? [];

  useEffect(() => {
    setConfigValues({});
  }, [provider]);

  const refresh = useCallback(async () => {
    const [cat, list] = await Promise.all([repo.catalog(), repo.list()]);
    setCatalog(cat);
    setItems(list);
    setProvider((prev) =>
      cat.length && !cat.some((c) => c.provider === prev)
        ? cat[0]!.provider
        : prev,
    );
  }, [repo]);

  useEffect(() => {
    void refresh().catch(() => push({ title: t("loadError"), tone: "error" }));
  }, [refresh, push, t]);

  async function run(fn: () => Promise<unknown>, okKey: "saved" | "probed" = "saved") {
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

  function catalogDesc(providerId: ExtIntProvider) {
    return t(`catalog.${providerId}` as "catalog.whatsapp");
  }

  return (
    <Screen data-testid="integrations-board" className="!space-y-4">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
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
        }
      />

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_28px_-14px_rgba(15,23,42,0.22)]">
        <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
          <aside className="border-b border-zinc-100 bg-zinc-50/80 p-4 lg:border-b-0 lg:border-e">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              <Plug className="h-3.5 w-3.5" />
              {t("catalogTitle")}
            </p>
            <ul className="space-y-2">
              {(catalog.length
                ? catalog
                : ([
                    {
                      id: "fallback-whatsapp",
                      provider: "whatsapp" as const,
                      name: "WhatsApp",
                      description: "",
                      configSchema: [],
                    },
                  ] as ExtIntCatalogItem[])
              ).map((c) => (
                <li
                  key={c.id}
                  className={cn(
                    "rounded-xl px-3 py-2.5 text-sm",
                    provider === c.provider
                      ? "bg-zinc-950 text-white"
                      : "bg-white text-zinc-800",
                  )}
                >
                  <button
                    type="button"
                    className="w-full text-start"
                    onClick={() => setProvider(c.provider)}
                  >
                    <span className="block font-semibold">
                      {t(`provider.${c.provider}` as "provider.whatsapp")}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block text-[11px] leading-snug",
                        provider === c.provider
                          ? "text-zinc-400"
                          : "text-zinc-500",
                      )}
                    >
                      {catalogDesc(c.provider) || c.description}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-2 border-t border-zinc-200/80 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                {t("addTitle")}
              </p>
              <Select
                value={provider}
                onValueChange={(v) => setProvider(v as ExtIntProvider)}
              >
                <SelectTrigger className="h-8 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(catalog.length
                    ? catalog.map((c) => c.provider)
                    : (["whatsapp", "email", "sms", "accounting"] as const)
                  ).map((p) => (
                    <SelectItem key={p} value={p}>
                      {t(`provider.${p}` as "provider.whatsapp")}
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
              {schemaFields.map((field) => (
                <Input
                  key={field}
                  className="h-8 bg-white"
                  placeholder={t(`configField.${field}` as "configField.access_token") || field}
                  value={configValues[field] ?? ""}
                  onChange={(e) =>
                    setConfigValues((prev) => ({
                      ...prev,
                      [field]: e.target.value,
                    }))
                  }
                />
              ))}
              <Button
                size="sm"
                className="w-full"
                disabled={busy || !displayName.trim()}
                onClick={() =>
                  void run(async () => {
                    const config: Record<string, string> = {};
                    for (const key of schemaFields) {
                      const v = configValues[key]?.trim();
                      if (v) config[key] = v;
                    }
                    await repo.create({
                      provider,
                      displayName: displayName.trim(),
                      config:
                        Object.keys(config).length > 0 ? config : undefined,
                    });
                    setDisplayName("");
                    setConfigValues({});
                  })
                }
              >
                {t("create")}
              </Button>
            </div>
          </aside>

          <div className="space-y-3 p-4 sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              {t("configured")}
            </p>
            {items.length === 0 ? (
              <EmptyState title={t("empty")} />
            ) : (
              <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-100">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-2 px-3 py-2.5 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-zinc-900">
                          {item.displayName}
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          {t(
                            `provider.${item.provider}` as "provider.whatsapp",
                          )}
                          {item.lastProbeAt
                            ? ` · ${t("lastProbe")}: ${new Date(item.lastProbeAt).toLocaleString()}`
                            : ""}
                        </p>
                      </div>
                      <Badge className={statusTone(item.status)}>
                        {t(`status.${item.status}` as "status.healthy")}
                      </Badge>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() =>
                          void run(() => repo.probe(item.id), "probed")
                        }
                      >
                        {t("probe")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          if (editConfigId === item.id) {
                            setEditConfigId(null);
                            return;
                          }
                          const cat = catalog.find(
                            (c) => c.provider === item.provider,
                          );
                          const next: Record<string, string> = {
                            ...item.config,
                          };
                          for (const key of cat?.configSchema ?? []) {
                            if (next[key] == null) next[key] = "";
                          }
                          setEditConfig(next);
                          setEditConfigId(item.id);
                        }}
                      >
                        {t("editConfig")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            repo.update(item.id, { enabled: !item.enabled }),
                          )
                        }
                      >
                        {item.enabled ? t("disable") : t("enable")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void run(() => repo.remove(item.id))}
                      >
                        {t("remove")}
                      </Button>
                    </div>
                    {editConfigId === item.id ? (
                      <div className="space-y-2 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3">
                        {Object.keys(editConfig).map((key) => (
                          <Input
                            key={key}
                            className="h-8 bg-white"
                            placeholder={
                              t(`configField.${key}` as "configField.access_token") ||
                              key
                            }
                            value={editConfig[key] ?? ""}
                            onChange={(e) =>
                              setEditConfig((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                          />
                        ))}
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              await repo.update(item.id, {
                                config: editConfig,
                              });
                              setEditConfigId(null);
                            })
                          }
                        >
                          {t("saveConfig")}
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Screen>
  );
}
