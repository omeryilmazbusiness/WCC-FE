export const ANONYMIZE_REASON_MIN = 10;

export const ACTIVE_BOOKINGS_CODE = "customer_has_active_bookings";

const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();

export function isReasonValid(reason: string): boolean {
  return reason.trim().length >= ANONYMIZE_REASON_MIN;
}

/** Typed confirmation must match the customer's name (case / extra spaces ignored). */
export function isNameConfirmed(typed: string, customerName: string): boolean {
  const expected = normalize(customerName);
  return expected.length > 0 && normalize(typed) === expected;
}

export function canSubmitAnonymize(input: {
  reason: string;
  typedName: string;
  customerName: string;
}): boolean {
  return isReasonValid(input.reason) && isNameConfirmed(input.typedName, input.customerName);
}
