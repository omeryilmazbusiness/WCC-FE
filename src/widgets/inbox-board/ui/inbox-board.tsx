"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Inbox,
  AlertTriangle,
  UserPlus,
  CheckCircle2,
  Ban,
  Copy,
  Plus,
} from "lucide-react";
import {
  createConversationRepository,
  hasConnectedSocial,
  isSLABreached,
  unansweredAgeMinutes,
  NEXT_TASK_OUTCOMES,
  type ChannelHealth,
  type Conversation,
  type ConversationRepository,
  type InboxMessage,
  type NextTaskOutcome,
  type NextTaskSuggestion,
} from "@/entities/conversation";
import { createLeadRepository } from "@/entities/lead";
import { createTaskRepository } from "@/entities/task";
import { createAIRepository } from "@/entities/ai";
import { isManagerRole } from "@/entities/user";
import { InboxSetupWizard } from "@/features/inbox-setup";
import { useSessionUser } from "@/shared/api/session-context";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Screen,
  SearchFilterBar,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useToast,
} from "@/shared/ui";

type Props = {
  repository?: ConversationRepository;
};

const OWNERS = [
  { id: "22222222-2222-2222-2222-222222222203", name: "Sales Employee" },
  { id: "22222222-2222-2222-2222-222222222202", name: "Branch Manager" },
];

export function InboxBoard({ repository: repositoryProp }: Props) {
  const t = useTranslations("inbox");
  const ts = useTranslations("inboxSetup");
  const tc = useTranslations("common");
  const tNext = useTranslations("nextTask");
  const { push } = useToast();
  const user = useSessionUser();
  const manager = isManagerRole(user.role);
  const repository = useMemo(
    () => repositoryProp ?? createConversationRepository(user.branchId),
    [repositoryProp, user.branchId],
  );
  const [setupReady, setSetupReady] = useState(false);
  const [forceSetup, setForceSetup] = useState(false);
  const [accounts, setAccounts] = useState<ChannelHealth[] | null>(null);
  const [channel, setChannel] = useState("all");
  const [queue, setQueue] = useState("all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Conversation[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [noteMode, setNoteMode] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [aiNext, setAiNext] = useState("");
  const [suggestion, setSuggestion] = useState<NextTaskSuggestion | null>(
    null,
  );
  const [pendingOutcome, setPendingOutcome] = useState<NextTaskOutcome | null>(
    null,
  );
  const aiRepo = useMemo(() => createAIRepository(), []);
  const [busy, setBusy] = useState(false);

  const connected = useMemo(
    () => (accounts ? hasConnectedSocial(accounts) : false),
    [accounts],
  );
  const showSetup = Boolean(accounts) && forceSetup && manager;
  const showWaiting = Boolean(accounts) && !connected && !manager;

  useEffect(() => {
    let cancelled = false;
    void repository.channelHealth().then((list) => {
      if (!cancelled) {
        setAccounts(list);
        setSetupReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [repository]);

  const health = useMemo(
    () => (accounts ?? []).filter((a) => a.connected),
    [accounts],
  );

  useEffect(() => {
    setSuggestion(null);
    setPendingOutcome(null);
  }, [selectedId]);

  const listFilter = useMemo(
    () => ({
      q: q || undefined,
      status: "open" as const,
      channel:
        channel === "all"
          ? undefined
          : (channel as Conversation["channel"]),
      unassigned: queue === "unassigned",
      mine: queue === "mine",
      slaBreached: queue === "sla",
      unansweredMinutes: queue === "age" ? 15 : undefined,
    }),
    [q, channel, queue],
  );

  const reload = useCallback(async () => {
    if (forceSetup) return;
    const list = await repository.list(listFilter);
    setRows(list);
    setSelectedId((prev) => {
      if (prev && list.some((c) => c.id === prev)) return prev;
      return list[0]?.id ?? null;
    });
  }, [repository, listFilter, forceSetup]);

  useEffect(() => {
    if (forceSetup) return;
    void reload();
  }, [reload, forceSetup]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedId || forceSetup) {
      setMessages((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    void repository.listMessages(selectedId).then((items) => {
      if (!cancelled) setMessages(items);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId, repository, forceSetup]);

  const selected = useMemo(
    () => rows?.find((c) => c.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const isFiltered = channel !== "all" || queue !== "all" || q.trim() !== "";

  async function send() {
    if (!selected || !draft.trim()) return;
    setBusy(true);
    try {
      const msg = await repository.reply(selected.id, draft.trim(), {
        internalNote: noteMode,
      });
      setMessages((prev) => [...prev, msg]);
      setDraft("");
      await reload();
      push({
        title: noteMode ? t("noteSaved") : t("replySent"),
        tone: "success",
      });
    } catch {
      push({ title: t("actionError"), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function assist() {
    if (!selected) return;
    setBusy(true);
    try {
      const out = await aiRepo.conversationAssist(selected.id);
      setAiSummary(out.summary || "");
      setAiNext(out.nextStep || "");
      if (out.replyDraft) setDraft(out.replyDraft);
      push({ title: t("aiAssistDone"), tone: "success" });
    } catch {
      push({ title: t("aiAssistError"), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function assign(ownerId: string) {
    if (!selected) return;
    try {
      await repository.assign(selected.id, ownerId);
      await reload();
      push({ title: t("assigned"), tone: "success" });
    } catch {
      push({ title: t("actionError"), tone: "error" });
    }
  }

  async function setStatus(status: Conversation["status"]) {
    if (!selected) return;
    try {
      await repository.setStatus(selected.id, status);
      await reload();
      push({ title: t("statusUpdated"), tone: "success" });
    } catch {
      push({ title: t("actionError"), tone: "error" });
    }
  }

  async function createLeadFromConvo() {
    if (!selected) return;
    try {
      const leadRepo = createLeadRepository();
      const owners = await leadRepo.listOwners();
      const owner = owners[0] ?? {
        id: user.id,
        name: user.fullName,
      };
      await leadRepo.create({
        fullName: selected.identityLabel || selected.subject || "Inbox lead",
        phone: "+905550000000",
        source: selected.channel,
        ownerId: owner.id,
        ownerName: owner.name,
      });
      push({ title: t("leadCreated"), tone: "success" });
    } catch {
      push({ title: t("actionError"), tone: "error" });
    }
  }

  async function createTaskFromConvo() {
    if (!selected) return;
    try {
      await createTaskRepository().create({
        title: `Follow up: ${selected.subject || selected.identityLabel}`,
        kind: "followup",
        assigneeId: selected.ownerId ?? user.id,
        assigneeName: selected.ownerName || user.fullName,
        relatedType: "conversation",
        relatedId: selected.id,
        relatedLabel: selected.subject || selected.identityLabel,
      });
      push({ title: t("taskCreated"), tone: "success" });
    } catch {
      push({ title: t("actionError"), tone: "error" });
    }
  }

  async function suggestOutcome(outcome: NextTaskOutcome) {
    if (!selected) return;
    setBusy(true);
    setPendingOutcome(outcome);
    try {
      const s = await repository.suggestNextTask(selected.id, outcome);
      setSuggestion(s);
      push({ title: tNext("suggested"), tone: "info" });
    } catch {
      push({ title: t("actionError"), tone: "error" });
      setPendingOutcome(null);
    } finally {
      setBusy(false);
    }
  }

  async function confirmOutcome() {
    if (!selected || !pendingOutcome) return;
    setBusy(true);
    try {
      const confirmed = await repository.confirmNextTask(
        selected.id,
        pendingOutcome,
      );
      push({
        title: tNext("confirmed"),
        description: confirmed.title,
        tone: "success",
      });
      setSuggestion(null);
      setPendingOutcome(null);
    } catch {
      push({ title: t("actionError"), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  if (!setupReady || accounts === null) {
    return (
      <Screen>
        <p className="text-sm font-medium text-zinc-500">{tc("loading")}</p>
      </Screen>
    );
  }

  if (showSetup) {
    return (
      <Screen data-testid="inbox-setup">
        <PageHeader
          title={ts("pageTitle")}
          description={ts("pageSubtitle")}
          className="mb-10"
        />
        <InboxSetupWizard
          repository={repository}
          accounts={accounts}
          onAccountsChange={setAccounts}
          onComplete={() => setForceSetup(false)}
        />
      </Screen>
    );
  }

  if (showWaiting) {
    return (
      <Screen data-testid="inbox-waiting">
        <PageHeader title={t("title")} description={t("subtitle")} />
        <EmptyState
          title={ts("waitingTitle")}
          description={ts("waitingBody")}
          icon={Inbox}
        />
      </Screen>
    );
  }

  if (!rows) {
    return (
      <Screen>
        <p className="text-sm font-medium text-zinc-500">{tc("loading")}</p>
      </Screen>
    );
  }

  return (
    <Screen data-testid="inbox-board">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-2" data-testid="channel-health">
              {health.map((h) => (
                <Badge
                  key={h.provider}
                  className={cn(
                    (h.status === "ok" || h.status === "connected") &&
                      "bg-emerald-50 text-emerald-800",
                    h.status === "degraded" && "bg-amber-50 text-amber-900",
                    h.status === "down" && "bg-rose-50 text-rose-800",
                  )}
                  title={h.lastError || undefined}
                >
                  {h.displayName || h.provider}
                </Badge>
              ))}
            </div>
            {manager ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setForceSetup(true)}
              >
                {ts("manageChannels")}
              </Button>
            ) : null}
          </div>
        }
      />

      <SearchFilterBar
        value={q}
        onValueChange={setQ}
        placeholder={t("searchPlaceholder")}
        clearLabel={tc("clearSearch")}
        filterLabel={tc("filter")}
        resetLabel={tc("resetFilters")}
        isFiltered={isFiltered}
        onReset={() => {
          setQ("");
          setChannel("all");
          setQueue("all");
        }}
        sections={[
          {
            id: "channel",
            label: t("channel"),
            value: channel,
            onChange: setChannel,
            options: [
              { value: "all", label: t("allChannels") },
              { value: "whatsapp", label: "WhatsApp" },
              { value: "instagram", label: "Instagram" },
              { value: "facebook", label: "Facebook" },
              { value: "gmail", label: "Gmail" },
              { value: "email", label: "Email" },
            ],
          },
          {
            id: "queue",
            label: t("queue"),
            value: queue,
            onChange: setQueue,
            options: [
              { value: "all", label: t("queueAll") },
              { value: "mine", label: t("queueMine") },
              { value: "unassigned", label: t("queueUnassigned") },
              { value: "sla", label: t("queueSLA") },
              { value: "age", label: t("queueAge") },
            ],
          },
        ]}
      />

      <div className="mt-4 grid min-h-[70vh] gap-3 lg:grid-cols-[280px_minmax(0,1fr)_280px]">
        <aside
          className="overflow-y-auto rounded-2xl border border-zinc-200/80 bg-white"
          data-testid="inbox-list"
        >
          {rows.length === 0 ? (
            <div className="p-4">
              <EmptyState title={t("empty")} description={t("emptyHint")} />
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {rows.map((c) => {
                const breached = isSLABreached(c);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={cn(
                        "w-full px-3 py-3 text-left transition hover:bg-zinc-50",
                        selectedId === c.id && "bg-sky-50/80",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-zinc-950">
                          {c.identityLabel || c.subject || t("unknown")}
                        </span>
                        {breached ? (
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {c.lastMessagePreview}
                      </p>
                      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                        {c.channel}
                        {c.unansweredSince
                          ? ` · ${unansweredAgeMinutes(c)}m`
                          : ""}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section
          className="flex min-h-[420px] flex-col rounded-2xl border border-zinc-200/80 bg-white"
          data-testid="inbox-thread"
        >
          {!selected ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <EmptyState title={t("pickThread")} icon={Inbox} />
            </div>
          ) : (
            <>
              <div className="border-b border-zinc-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-zinc-950">
                  {selected.subject || selected.identityLabel}
                </h2>
                <p className="text-xs text-zinc-500">
                  {selected.channel}
                  {selected.ownerName ? ` · ${selected.ownerName}` : ""}
                  {isSLABreached(selected) ? ` · ${t("slaBreached")}` : ""}
                </p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                      m.direction === "in" && "bg-zinc-100 text-zinc-900",
                      m.direction === "out" &&
                        "ml-auto bg-sky-600 text-white",
                      m.direction === "note" &&
                        "border border-dashed border-amber-300 bg-amber-50 text-amber-950",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p
                      className={cn(
                        "mt-1 text-[10px]",
                        m.direction === "out"
                          ? "text-sky-100"
                          : "text-zinc-400",
                      )}
                    >
                      {m.direction}
                      {m.authorName ? ` · ${m.authorName}` : ""}
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-zinc-100 p-3">
                <div className="mb-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={noteMode ? "default" : "outline"}
                    onClick={() => setNoteMode((v) => !v)}
                  >
                    {t("internalNote")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy || !selected}
                    onClick={() => void assist()}
                  >
                    {t("aiAssist")}
                  </Button>
                </div>
                {aiSummary ? (
                  <div className="mb-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600">
                    <p className="font-semibold text-zinc-900">{aiSummary}</p>
                    {aiNext ? <p className="mt-1">{aiNext}</p> : null}
                  </div>
                ) : null}
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={
                    noteMode ? t("notePlaceholder") : t("replyPlaceholder")
                  }
                  rows={3}
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy || !draft.trim()}
                    onClick={() => void send()}
                  >
                    {noteMode ? t("saveNote") : t("send")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>

        <aside
          className="overflow-y-auto rounded-2xl border border-zinc-200/80 bg-white p-4"
          data-testid="inbox-context"
        >
          {!selected ? null : (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {t("assign")}
                </p>
                <Select onValueChange={(v) => void assign(v)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue
                      placeholder={selected.ownerName || t("unassigned")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {OWNERS.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void setStatus("resolved")}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {t("resolve")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void setStatus("spam")}
                >
                  <Ban className="h-4 w-4" />
                  {t("spam")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void setStatus("duplicate")}
                >
                  <Copy className="h-4 w-4" />
                  {t("duplicate")}
                </Button>
              </div>

              <div className="flex flex-col gap-2 border-t border-zinc-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {tNext("title")}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {NEXT_TASK_OUTCOMES.map((outcome) => (
                    <Button
                      key={outcome}
                      type="button"
                      size="sm"
                      variant={
                        pendingOutcome === outcome ? "default" : "outline"
                      }
                      disabled={busy}
                      onClick={() => void suggestOutcome(outcome)}
                    >
                      {tNext(`outcomes.${outcome}`)}
                    </Button>
                  ))}
                </div>
                {suggestion ? (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs">
                    <p className="font-semibold text-zinc-900">
                      {suggestion.title}
                    </p>
                    {suggestion.description ? (
                      <p className="mt-1 text-zinc-500">
                        {suggestion.description}
                      </p>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      className="mt-2 w-full"
                      disabled={busy || !pendingOutcome}
                      onClick={() => void confirmOutcome()}
                    >
                      {tNext("confirm")}
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-2 border-t border-zinc-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {t("createFrom")}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void createLeadFromConvo()}
                >
                  <UserPlus className="h-4 w-4" />
                  {t("createLead")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void createTaskFromConvo()}
                >
                  <Plus className="h-4 w-4" />
                  {t("createTask")}
                </Button>
                <Button asChild type="button" size="sm" variant="outline">
                  <Link href={routes.bookings}>{t("createBooking")}</Link>
                </Button>
                {selected.customerId ? (
                  <Link
                    href={routes.customer(selected.customerId)}
                    className="text-xs font-semibold text-sky-700 hover:underline"
                  >
                    {t("openCustomer")}
                  </Link>
                ) : null}
                {selected.leadId ? (
                  <Link
                    href={routes.pipeline}
                    className="text-xs font-semibold text-sky-700 hover:underline"
                  >
                    {t("openPipeline")}
                  </Link>
                ) : null}
              </div>
            </div>
          )}
        </aside>
      </div>
    </Screen>
  );
}
