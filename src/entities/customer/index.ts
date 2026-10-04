export type {
  Customer,
  CustomerCreateInput,
  CustomerDataExport,
  CustomerQuickFilter,
  CustomerStats,
  CustomerUpdateInput,
  CompanionLink,
  PassportStatus,
  ProfileField,
  TimelineItem,
  TimelineKind,
  DuplicateMatch,
} from "./model";
export {
  COMPLETE_PROFILE_PCT,
  PASSPORT_WARNING_MONTHS,
  ageOn,
  customerStats,
  matchesQuickFilter,
  metaString,
  missingProfileFields,
  needsPassportAction,
  passportStatus,
  paymentAmount,
  profileCompleteness,
  quickFilterCounts,
} from "./model";
export type { CustomerRepository } from "./api";
export {
  ApiCustomerRepository,
  MemoryCustomerRepository,
  createCustomerRepository,
} from "./api";
export { CustomerAvatar } from "./ui/customer-avatar";
export { CustomerCard } from "./ui/customer-card";
export { PASSPORT_LOOK, TIMELINE_LOOK, timelineLook, type Look } from "./ui/look";
