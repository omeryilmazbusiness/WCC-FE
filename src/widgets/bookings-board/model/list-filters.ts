import type {
  BookingDateField,
  BookingListParams,
  BookingSegment,
  BookingSort,
  BookingStatus,
  SalesChannel,
  ServiceType,
} from "@/entities/booking";

export const ALL = "all";
type Any<T extends string> = T | typeof ALL;

export type BookingFilterValues = {
  segment: Any<BookingSegment>;
  service: Any<ServiceType>;
  channel: Any<SalesChannel>;
  status: Any<BookingStatus>;
  sort: BookingSort;
  dateField: BookingDateField;
  from: string;
  to: string;
};

export const DEFAULT_FILTERS: BookingFilterValues = {
  segment: ALL,
  service: ALL,
  channel: ALL,
  status: ALL,
  sort: "recent",
  dateField: "created",
  from: "",
  to: "",
};

export type ListScope = { customerId?: string; departureId?: string };

/** UI filter state → list params; `all` and blank values are dropped. */
export function toListParams(values: BookingFilterValues, query: string, scope: ListScope, dayEnd: string): BookingListParams {
  const pick = <T extends string>(v: Any<T>): T | undefined => (v === ALL ? undefined : v);
  const hasRange = Boolean(values.from || values.to);
  const [from, to] = values.from && values.to && values.from > values.to ? [values.to, values.from] : [values.from, values.to];
  return {
    ...scope,
    q: query.trim() || undefined,
    segment: pick(values.segment),
    serviceType: pick(values.service),
    channel: pick(values.channel),
    status: pick(values.status),
    sort: values.sort === "recent" ? undefined : values.sort,
    dateField: hasRange ? values.dateField : undefined,
    from: from || undefined,
    to: to || undefined,
    dayEnd,
  };
}

/** Count of filters that differ from the defaults (search text excluded). */
export function activeFilterCount(values: BookingFilterValues): number {
  let n = 0;
  if (values.segment !== ALL) n++;
  if (values.service !== ALL) n++;
  if (values.channel !== ALL) n++;
  if (values.status !== ALL) n++;
  if (values.sort !== DEFAULT_FILTERS.sort) n++;
  if (values.from || values.to) n++;
  return n;
}
