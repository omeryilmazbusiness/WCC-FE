"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  FileText,
  Gauge,
  ListTree,
  MessageSquareText,
  Settings2,
  ShieldAlert,
  SlidersHorizontal,
  Tags,
} from "lucide-react";
import {
  createAdminConfigRepository,
  type CustomFieldDef,
  type EscalationRule,
  type EventCatalogItem,
  type FieldEntity,
  type LostReason,
  type MessageTemplate,
  type SlaSettings,
  type ThresholdSettings,
} from "@/entities/adminconfig";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import {
  Badge,
  Button,
  Input,
  Label,
  PageHeader,
  Screen,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  useToast,
} from "@/shared/ui";

type Section =
  | "sla"
  | "escalation"
  | "lostReasons"
  | "templates"
  | "fields"
  | "thresholds"
  | "events"
  | "docPolicies";

export function AdminSettingsBoard() {
  const t = useTranslations("adminSettings");
  const { push } = useToast();
  const repo = useMemo(() => createAdminConfigRepository(), []);
  const [tab, setTab] = useState<Section>("sla");
  const [busy, setBusy] = useState(false);

  const [sla, setSla] = useState<SlaSettings | null>(null);
  const [escalation, setEscalation] = useState<EscalationRule[]>([]);
  const [lostReasons, setLostReasons] = useState<LostReason[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [fieldEntity, setFieldEntity] = useState<FieldEntity>("lead");
  const [fields, setFields] = useState<CustomFieldDef[]>([]);
  const [thresholds, setThresholds] = useState<ThresholdSettings | null>(null);
  const [events, setEvents] = useState<EventCatalogItem[]>([]);

  const [newReasonCode, setNewReasonCode] = useState("");
  const [newReasonLabel, setNewReasonLabel] = useState("");
  const [newTplCode, setNewTplCode] = useState("");
  const [newTplBody, setNewTplBody] = useState("");

  const refresh = useCallback(async () => {
    const [s, e, lr, tpl, fld, th, ev] = await Promise.all([
      repo.getSla(),
      repo.listEscalation(),
      repo.listLostReasons(),
      repo.listTemplates(),
      repo.getFields(fieldEntity),
      repo.getThresholds(),
      repo.listEventsCatalog(),
    ]);
    setSla(s);
    setEscalation(e);
    setLostReasons(lr);
    setTemplates(tpl);
    setFields(fld.fields);
    setThresholds(th);
    setEvents(ev);
  }, [repo, fieldEntity]);

  useEffect(() => {
    void refresh().catch(() => push({ title: t("loadError"), tone: "error" }));
  }, [refresh, push, t]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await refresh();
      push({ title: t("saved"), tone: "success" });
    } catch (err) {
      push({
        title: t("actionError"),
        description: err instanceof Error ? err.message : undefined,
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  const sections: { id: Section; label: string; icon: typeof Settings2 }[] = [
    { id: "sla", label: t("sections.sla"), icon: Gauge },
    { id: "escalation", label: t("sections.escalation"), icon: Bell },
    { id: "lostReasons", label: t("sections.lostReasons"), icon: Tags },
    { id: "templates", label: t("sections.templates"), icon: MessageSquareText },
    { id: "fields", label: t("sections.fields"), icon: ListTree },
    { id: "thresholds", label: t("sections.thresholds"), icon: SlidersHorizontal },
    { id: "events", label: t("sections.events"), icon: ShieldAlert },
    { id: "docPolicies", label: t("sections.docPolicies"), icon: FileText },
  ];

  return (
    <Screen data-testid="admin-settings-board" className="!space-y-4">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setTab(s.id)}
              className={
                tab === s.id
                  ? "flex items-center gap-3 rounded-2xl border border-zinc-900 bg-zinc-950 px-4 py-3 text-start text-white shadow-sm"
                  : "flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 text-start text-zinc-800 hover:border-zinc-300"
              }
            >
              <span
                className={
                  tab === s.id
                    ? "flex h-9 w-9 items-center justify-center rounded-xl bg-white/10"
                    : "flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600"
                }
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span className="text-sm font-semibold">{s.label}</span>
            </button>
          );
        })}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Section)}>
        <TabsList className="hidden">
          {sections.map((s) => (
            <TabsTrigger key={s.id} value={s.id}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="sla" className="mt-0">
          {sla ? (
            <div className="space-y-3 rounded-2xl border border-zinc-200/80 bg-white p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>{t("sla.firstResponse")}</Label>
                  <Input
                    type="number"
                    className="mt-1.5"
                    value={sla.firstResponseMinutes}
                    onChange={(e) =>
                      setSla({
                        ...sla,
                        firstResponseMinutes: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>{t("sla.resolve")}</Label>
                  <Input
                    type="number"
                    className="mt-1.5"
                    value={sla.resolveMinutes}
                    onChange={(e) =>
                      setSla({
                        ...sla,
                        resolveMinutes: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                    <input
                      type="checkbox"
                      checked={sla.businessHoursOnly}
                      onChange={(e) =>
                        setSla({
                          ...sla,
                          businessHoursOnly: e.target.checked,
                        })
                      }
                    />
                    {t("sla.businessHours")}
                  </label>
                </div>
              </div>
              <Button
                size="sm"
                disabled={busy}
                onClick={() => void run(() => repo.putSla(sla))}
              >
                {t("save")}
              </Button>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="escalation" className="mt-0">
          <div className="space-y-2 rounded-2xl border border-zinc-200/80 bg-white p-5">
            {escalation.length === 0 ? (
              <p className="text-sm text-zinc-500">{t("empty")}</p>
            ) : (
              escalation.map((rule) => (
                <div
                  key={rule.kind}
                  className="flex flex-wrap items-center gap-2 border-b border-zinc-100 py-2 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-900">
                      {rule.kind}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {t("escalation.after")}: {rule.afterMinutes}m ·{" "}
                      {rule.escalateToRole}
                    </p>
                  </div>
                  <Badge
                    className={
                      rule.enabled
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-zinc-100 text-zinc-500"
                    }
                  >
                    {rule.enabled ? t("enabled") : t("disabled")}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        repo.putEscalation(rule.kind, {
                          ...rule,
                          enabled: !rule.enabled,
                        }),
                      )
                    }
                  >
                    {rule.enabled ? t("disable") : t("enable")}
                  </Button>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="lostReasons" className="mt-0">
          <div className="space-y-3 rounded-2xl border border-zinc-200/80 bg-white p-5">
            <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-100">
              {lostReasons.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-2 px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-900">
                      {r.labelEn || r.code}
                    </p>
                    <p className="text-[11px] text-zinc-400">{r.code}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void run(() => repo.deleteLostReason(r.id))
                    }
                  >
                    {t("remove")}
                  </Button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Input
                className="max-w-[140px]"
                placeholder={t("lostReasons.code")}
                value={newReasonCode}
                onChange={(e) => setNewReasonCode(e.target.value)}
              />
              <Input
                className="max-w-[200px]"
                placeholder={t("lostReasons.label")}
                value={newReasonLabel}
                onChange={(e) => setNewReasonLabel(e.target.value)}
              />
              <Button
                size="sm"
                disabled={busy || !newReasonCode.trim()}
                onClick={() =>
                  void run(async () => {
                    await repo.createLostReason({
                      code: newReasonCode.trim(),
                      labelEn: newReasonLabel.trim(),
                    });
                    setNewReasonCode("");
                    setNewReasonLabel("");
                  })
                }
              >
                {t("add")}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <div className="space-y-3 rounded-2xl border border-zinc-200/80 bg-white p-5">
            <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-100">
              {templates.map((tpl) => (
                <li key={tpl.id} className="px-3 py-2.5 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-zinc-900">{tpl.code}</p>
                      <p className="truncate text-[11px] text-zinc-400">
                        {tpl.channel} · {tpl.bodyEn}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void run(() => repo.deleteTemplate(tpl.id))
                      }
                    >
                      {t("remove")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="space-y-2">
              <Input
                placeholder={t("templates.code")}
                value={newTplCode}
                onChange={(e) => setNewTplCode(e.target.value)}
              />
              <Textarea
                placeholder={t("templates.body")}
                value={newTplBody}
                onChange={(e) => setNewTplBody(e.target.value)}
                rows={2}
              />
              <Button
                size="sm"
                disabled={busy || !newTplCode.trim()}
                onClick={() =>
                  void run(async () => {
                    await repo.createTemplate({
                      code: newTplCode.trim(),
                      bodyEn: newTplBody.trim(),
                    });
                    setNewTplCode("");
                    setNewTplBody("");
                  })
                }
              >
                {t("add")}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="fields" className="mt-0">
          <div className="space-y-3 rounded-2xl border border-zinc-200/80 bg-white p-5">
            <div className="flex flex-wrap gap-2">
              {(["lead", "customer", "booking"] as FieldEntity[]).map((ent) => (
                <Button
                  key={ent}
                  size="sm"
                  variant={fieldEntity === ent ? "default" : "outline"}
                  onClick={() => setFieldEntity(ent)}
                >
                  {t(`fields.entity.${ent}` as "fields.entity.lead")}
                </Button>
              ))}
            </div>
            <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-100">
              {fields.map((f) => (
                <li key={f.key} className="px-3 py-2.5 text-sm">
                  <p className="font-medium text-zinc-900">
                    {f.labelEn || f.key}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {f.key} · {f.fieldType}
                    {f.required ? ` · ${t("required")}` : ""}
                  </p>
                </li>
              ))}
            </ul>
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                void run(() =>
                  repo.putFields(fieldEntity, [
                    ...fields,
                    {
                      key: `custom_${fields.length + 1}`,
                      labelEn: `Custom ${fields.length + 1}`,
                      labelAr: "",
                      fieldType: "text",
                      required: false,
                      options: [],
                      sortOrder: fields.length + 1,
                    },
                  ]),
                )
              }
            >
              {t("fields.add")}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="thresholds" className="mt-0">
          {thresholds ? (
            <div className="space-y-3 rounded-2xl border border-zinc-200/80 bg-white p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    ["softCapacityPct", t("thresholds.softCapacity")],
                    ["hardCapacityPct", t("thresholds.hardCapacity")],
                    ["overdueTaskHours", t("thresholds.overdueTask")],
                    ["unpaidBookingDays", t("thresholds.unpaidBooking")],
                    ["marginAlertPct", t("thresholds.marginAlert")],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <Label>{label}</Label>
                    <Input
                      type="number"
                      className="mt-1.5"
                      value={thresholds[key]}
                      onChange={(e) =>
                        setThresholds({
                          ...thresholds,
                          [key]: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                disabled={busy}
                onClick={() => void run(() => repo.putThresholds(thresholds))}
              >
                {t("save")}
              </Button>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="events" className="mt-0">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-5">
            {events.length === 0 ? (
              <p className="text-sm text-zinc-500">{t("empty")}</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {events.map((ev) => (
                  <li key={ev.code} className="flex gap-3 py-2.5 text-sm">
                    <Badge className="bg-zinc-100 text-zinc-700">
                      {ev.severity}
                    </Badge>
                    <div>
                      <p className="font-medium text-zinc-900">{ev.code}</p>
                      <p className="text-xs text-zinc-500">
                        {ev.category} · {ev.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="docPolicies" className="mt-0">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-5">
            <p className="text-sm text-zinc-600">{t("docPoliciesBody")}</p>
            <Button asChild size="sm" className="mt-3" variant="outline">
              <Link href={routes.missingDocs}>{t("docPoliciesLink")}</Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </Screen>
  );
}
