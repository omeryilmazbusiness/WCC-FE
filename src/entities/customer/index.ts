export type {
  Customer,
  CustomerCreateInput,
  CustomerDataExport,
  CustomerUpdateInput,
  CompanionLink,
  TimelineItem,
  DuplicateMatch,
} from "./model";
export type { CustomerRepository } from "./api";
export {
  ApiCustomerRepository,
  MemoryCustomerRepository,
  createCustomerRepository,
} from "./api";
