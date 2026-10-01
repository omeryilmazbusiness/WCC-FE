export type {
  InboxChannel,
  SocialChannel,
  ConversationStatus,
  MessageDirection,
  MessageStatus,
  ConnectionState,
  Conversation,
  InboxMessage,
  ChannelHealth,
  ConversationListFilter,
  ConnectCredentials,
  NextTaskOutcome,
  NextTaskSuggestion,
  ConfirmedNextTask,
  ChannelCounts,
} from "./model";
export {
  SOCIAL_CHANNELS,
  NEXT_TASK_OUTCOMES,
  INBOX_CHANNEL_ORDER,
  visibleChannels,
  isSLABreached,
  unansweredAgeMinutes,
  hasConnectedSocial,
} from "./model";
export {
  type ConversationRepository,
  ApiConversationRepository,
  MemoryConversationRepository,
  getMemoryConversationRepository,
  createConversationRepository,
} from "./api";
export { CHANNEL_LOOK, channelLook, type ChannelLook } from "./ui/channel-look";
