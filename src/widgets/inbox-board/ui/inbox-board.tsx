"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { MessagesSquare } from "lucide-react";
import {
  createConversationRepository,
  hasConnectedSocial,
  visibleChannels,
  type ChannelHealth,
  type ConversationRepository,
  type InboxChannel,
} from "@/entities/conversation";
import { useCan } from "@/entities/viewer";
import { InboxSetupWizard } from "@/features/inbox-setup";
import { useSessionUser } from "@/shared/api/session-context";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { PageHeader, QueryState, Screen, SearchFilterBar, useMutationFeedback } from "@/shared/ui";
import { loadBranchAssignees, useAssignees, type AssigneeLoader } from "../model/use-assignees";
import { useConversationActions } from "../model/use-conversation-actions";
import { INBOX_QUEUES, useConversationList, type InboxQueue } from "../model/use-conversation-list";
import { useConversationThread } from "../model/use-conversation-thread";
import { ChannelTabs } from "./channel-tabs";
import { ContextPanel } from "./context-panel";
import { ConversationList } from "./conversation-list";
import { ConversationThread } from "./conversation-thread";
import { InboxHeader } from "./inbox-header";
import { NoChannelsState } from "./no-channels-state";
import { ReplyComposer } from "./reply-composer";

type Props = {
  repository?: ConversationRepository;
  /** Who conversations can be handed to; defaults to active branch users. */
  loadAssignees?: AssigneeLoader;
};

/** Unified inbox: channel tabs, queue search, thread and the agent's action rail. */
export function InboxBoard({ repository: repositoryProp, loadAssignees = loadBranchAssignees }: Props) {
  const t = useTranslations("inbox");
  const ts = useTranslations("inboxSetup");
  const tc = useTranslations("common");
  const user = useSessionUser();
  const can = {
    manageChannels: useCan("integrations.write"),
    write: useCan("inbox.write"),
    assist: useCan("ai.write"),
    createTask: useCan("tasks.write"),
    createBooking: useCan("bookings.write"),
    listUsers: useCan("users.read"),
  };
  const repository = useMemo(
    () => repositoryProp ?? createConversationRepository(user.branchId),
    [repositoryProp, user.branchId],
  );

  const feedback = useMutationFeedback();
  const [channels, setChannels] = useState<ChannelHealth[] | null>(null);
  const [channelsError, setChannelsError] = useState<unknown>(null);
  const [setupAccounts, setSetupAccounts] = useState<ChannelHealth[] | null>(null);
  const [openingSetup, setOpeningSetup] = useState(false);
  const [search, setSearch] = useState("");
  const [queue, setQueue] = useState<InboxQueue>("all");
  const [channel, setChannel] = useState<InboxChannel | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const q = useDebouncedValue(search.trim(), 300);

  const loadChannels = useCallback(async () => {
    try {
      setChannels(await repository.inboxChannels());
      setChannelsError(null);
    } catch (err) {
      setChannelsError(err);
    }
  }, [repository]);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  /** The wizard needs the full account view (webhook URLs, public ids), which only channel managers may read. */
  async function openSetup() {
    setOpeningSetup(true);
    try {
      setSetupAccounts(await repository.channelHealth());
    } catch (err) {
      feedback.error(err);
    } finally {
      setOpeningSetup(false);
    }
  }

  const connected = channels !== null && hasConnectedSocial(channels);
  const showSetup = setupAccounts !== null && can.manageChannels;
  const listEnabled = connected && !showSetup;

  const query = useMemo(() => ({ q, queue, channel }), [q, queue, channel]);
  const list = useConversationList({ repository, query, enabled: listEnabled });
  const rows = list.rows;
  const selected = rows?.find((c) => c.id === selectedId) ?? rows?.[0] ?? null;
  const thread = useConversationThread(repository, selected?.id ?? null);
  const assignees = useAssignees(loadAssignees, user.branchId, can.write && can.listUsers);
  const actions = useConversationActions({
    repository,
    conversation: selected,
    user,
    onUpdated: list.apply,
    onMessage: (m) => {
      thread.append(m);
      void list.reload();
    },
  });

  const live = useMemo(() => (channels ?? []).filter((a) => a.connected), [channels]);
  const tabs = useMemo(() => visibleChannels(channels, list.counts), [channels, list.counts]);

  const queueLabels: Record<InboxQueue, string> = {
    all: t("queueAll"),
    mine: t("queueMine"),
    unassigned: t("queueUnassigned"),
    sla: t("queueSLA"),
    age: t("queueAge"),
  };

  if (!channels) {
    return (
      <Screen>
        <InboxHeader health={[]} />
        <QueryState loading={!channelsError} loadingLabel={tc("loading")} error={channelsError} onRetry={() => void loadChannels()}>
          {null}
        </QueryState>
      </Screen>
    );
  }

  if (showSetup && setupAccounts) {
    return (
      <Screen data-testid="inbox-setup">
        <PageHeader title={ts("pageTitle")} description={ts("pageSubtitle")} className="mb-10" />
        <InboxSetupWizard
          repository={repository}
          accounts={setupAccounts}
          onAccountsChange={(next) => {
            setSetupAccounts(next);
            setChannels(next);
          }}
          onComplete={() => {
            setSetupAccounts(null);
            void loadChannels();
          }}
        />
      </Screen>
    );
  }

  if (!connected) {
    return (
      <Screen data-testid={can.manageChannels ? "inbox-no-channels-screen" : "inbox-waiting"}>
        <InboxHeader health={[]} />
        <NoChannelsState onConnect={can.manageChannels ? () => void openSetup() : undefined} connecting={openingSetup} />
      </Screen>
    );
  }

  return (
    <Screen data-testid="inbox-board">
      <InboxHeader
        health={live}
        onManageChannels={can.manageChannels ? () => void openSetup() : undefined}
        managing={openingSetup}
      />

      <SearchFilterBar
        variant="hero"
        value={search}
        onValueChange={setSearch}
        placeholder={t("searchPlaceholder")}
        clearLabel={tc("clearSearch")}
        filterLabel={tc("filter")}
        resetLabel={tc("resetFilters")}
        loading={list.loading && rows !== null}
        isFiltered={search.trim() !== "" || queue !== "all"}
        onReset={() => {
          setSearch("");
          setQueue("all");
        }}
        sections={[
          {
            id: "queue",
            label: t("queue"),
            value: queue,
            onChange: setQueue,
            options: INBOX_QUEUES.map((value) => ({ value, label: queueLabels[value] })),
          },
        ]}
        inputProps={{ "data-testid": "inbox-search" }}
      />

      {!rows ? (
        <QueryState loading={!list.error} loadingLabel={tc("loading")} error={list.error} onRetry={() => void list.reload()}>
          {null}
        </QueryState>
      ) : (
        <div className="grid gap-4 lg:h-[calc(100dvh-19.5rem)] lg:min-h-[34rem] lg:grid-cols-[minmax(0,1fr)_21rem] min-[1440px]:grid-cols-[minmax(0,1fr)_22.5rem]">
          <div className="flex min-h-[32rem] min-w-0 flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.05),0_18px_40px_-30px_rgba(15,23,42,0.35)]">
            <div className="border-b border-zinc-100 p-2.5">
              <ChannelTabs channels={tabs} value={channel} counts={list.counts} onChange={setChannel} />
            </div>
            <div className="flex min-h-0 min-w-0 flex-1">
              <div
                className="w-[19rem] shrink-0 overflow-y-auto border-e border-zinc-100 [scrollbar-width:thin] min-[1440px]:w-[21rem]"
                data-testid="inbox-list"
              >
                <ConversationList
                  rows={rows}
                  selectedId={selected?.id ?? null}
                  currentUserId={user.id}
                  loading={list.loading}
                  onSelect={setSelectedId}
                />
              </div>
              {selected ? (
                <ConversationThread
                  conversation={selected}
                  messages={thread.messages}
                  loading={thread.loading}
                  composer={
                    can.write ? (
                      <ReplyComposer
                        key={selected.id}
                        sending={actions.pending === "reply"}
                        assisting={actions.pending === "assist"}
                        onSend={actions.reply}
                        onAssist={can.assist ? actions.assist : undefined}
                        assistNote={actions.assistNote}
                      />
                    ) : null
                  }
                />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center" data-testid="inbox-thread">
                  <span className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-sky-50 text-sky-600">
                    <MessagesSquare className="h-6 w-6" strokeWidth={2} aria-hidden />
                  </span>
                  <p className="text-sm font-semibold text-zinc-800">{t("pickThread")}</p>
                  <p className="max-w-xs text-xs leading-5 text-zinc-500">{t("pickThreadHint")}</p>
                </div>
              )}
            </div>
          </div>

          {selected ? (
            <ContextPanel
              key={selected.id}
              conversation={selected}
              repository={repository}
              actions={actions}
              assignees={assignees}
              currentUserId={user.id}
              can={{ write: can.write, createTask: can.createTask, createBooking: can.createBooking }}
              onLinked={() => void list.reload()}
            />
          ) : (
            <div className="hidden rounded-[24px] bg-white/60 lg:block" aria-hidden />
          )}
        </div>
      )}
    </Screen>
  );
}
