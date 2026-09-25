export type InboxChannel =
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "gmail"
  | "email"
  | "stub";

export type SocialChannel = "whatsapp" | "instagram" | "facebook" | "gmail";

export const SOCIAL_CHANNELS: SocialChannel[] = [
  "whatsapp",
  "instagram",
  "facebook",
  "gmail",
];

/** BYO credentials posted to POST /integrations/accounts/{provider}/connect */
export type ConnectCredentials = {
  display_name?: string;
  access_token?: string;
  phone_number_id?: string;
  waba_id?: string;
  display_phone?: string;
  page_id?: string;
  ig_user_id?: string;
  client_id?: string;
  client_secret?: string;
  refresh_token?: string;
  mailbox_email?: string;
  verify_token?: string;
};

export type ConversationStatus = "open" | "resolved" | "spam" | "duplicate";
export type MessageDirection = "in" | "out" | "note";
export type MessageStatus =
  | "received"
  | "queued"
  | "sent"
  | "failed"
  | "noted";

export type ConnectionState =
  | "disconnected"
  | "pending"
  | "connected"
  | "degraded"
  | "down";

export type Conversation = {
  id: string;
  branchId: string;
  channel: InboxChannel;
  customerId: string | null;
  leadId: string | null;
  ownerId: string | null;
  ownerName: string;
  subject: string;
  status: ConversationStatus;
  slaDueAt: string | null;
  slaBreachedAt: string | null;
  unansweredSince: string | null;
  lastMessagePreview: string;
  customerName: string;
  identityLabel: string;
  updatedAt: string;
  createdAt: string;
};

export type InboxMessage = {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  body: string;
  status: MessageStatus;
  authorName: string;
  errorMessage: string;
  createdAt: string;
};

export type ChannelHealth = {
  provider: InboxChannel;
  displayName: string;
  status: ConnectionState | string;
  lastError: string;
  lastOkAt: string | null;
  connected: boolean;
  publicMeta?: Record<string, string>;
  webhookPath?: string;
  webhookUrl?: string;
};

export type ConversationListFilter = {
  q?: string;
  channel?: InboxChannel | "";
  status?: ConversationStatus | "";
  unassigned?: boolean;
  mine?: boolean;
  slaBreached?: boolean;
  unansweredMinutes?: number;
};

export type NextTaskOutcome =
  | "follow_up"
  | "send_quote"
  | "docs_pending"
  | "payment_due";

export const NEXT_TASK_OUTCOMES: NextTaskOutcome[] = [
  "follow_up",
  "send_quote",
  "docs_pending",
  "payment_due",
];

export type NextTaskSuggestion = {
  outcome: NextTaskOutcome | string;
  title: string;
  description: string;
  dueAt: string | null;
  priority: number;
  kind: string;
};

export type ConfirmedNextTask = {
  taskId: string;
  title: string;
  outcome: string;
};

export function isSLABreached(c: Conversation, now = new Date()): boolean {
  if (c.slaBreachedAt) return true;
  if (!c.slaDueAt || c.status !== "open") return false;
  return new Date(c.slaDueAt).getTime() < now.getTime();
}

export function unansweredAgeMinutes(c: Conversation, now = new Date()): number {
  if (!c.unansweredSince) return 0;
  return Math.max(
    0,
    Math.round((now.getTime() - new Date(c.unansweredSince).getTime()) / 60000),
  );
}

export function hasConnectedSocial(accounts: ChannelHealth[]): boolean {
  return accounts.some(
    (a) =>
      SOCIAL_CHANNELS.includes(a.provider as SocialChannel) && a.connected,
  );
}
