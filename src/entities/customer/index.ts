export type {
  Customer,
  CustomerCreateInput,
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
