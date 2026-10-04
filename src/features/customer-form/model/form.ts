import { z } from "zod";
import type { Customer, CustomerCreateInput, CustomerUpdateInput } from "@/entities/customer";
import { passportPatchValue } from "@/shared/lib/pii";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const PHONE = /^\+?[\d\s()-]{6,24}$/;

/** `t` resolves keys under `customers.form` (messages are shown as-is by `FormMessage`). */
export function customerFormSchema(t: (key: string) => string) {
  const optionalDay = z.string().refine((v) => v === "" || DAY.test(v), t("errors.date"));
  return z
    .object({
      fullName: z.string().trim().min(2, t("errors.fullName")).max(120),
      fullNameAr: z.string().trim().max(120),
      phone: z.string().trim().regex(PHONE, t("errors.phone")),
      email: z.string().trim().refine((v) => v === "" || z.email().safeParse(v).success, t("errors.email")),
      nationality: z.string().trim().max(60),
      passportNo: z.string().trim().max(20),
      passportExpiresAt: optionalDay,
      dateOfBirth: optionalDay,
      specialRequirements: z.string().trim().max(500),
      notes: z.string().trim().max(2000),
    })
    .refine((v) => !v.dateOfBirth || !v.passportExpiresAt || v.passportExpiresAt > v.dateOfBirth, {
      path: ["passportExpiresAt"],
      message: t("errors.expiryBeforeBirth"),
    });
}

export type CustomerFormValues = z.infer<ReturnType<typeof customerFormSchema>>;

export const CUSTOMER_FORM_FIELDS = [
  "fullName",
  "fullNameAr",
  "phone",
  "email",
  "nationality",
  "passportNo",
  "passportExpiresAt",
  "dateOfBirth",
  "specialRequirements",
  "notes",
] as const satisfies readonly (keyof CustomerFormValues)[];

/** The passport number is never prefilled: the API only returns it masked. */
export function customerFormDefaults(c?: Customer | null): CustomerFormValues {
  return {
    fullName: c?.fullName ?? "",
    fullNameAr: c?.fullNameAr ?? "",
    phone: c?.phone ?? "",
    email: c?.email ?? "",
    nationality: c?.nationality ?? "",
    passportNo: "",
    passportExpiresAt: c?.passportExpiresAt?.slice(0, 10) ?? "",
    dateOfBirth: c?.dateOfBirth?.slice(0, 10) ?? "",
    specialRequirements: c?.specialRequirements ?? "",
    notes: c?.notes ?? "",
  };
}

export function toCreateInput(v: CustomerFormValues): CustomerCreateInput {
  return {
    fullName: v.fullName,
    fullNameAr: v.fullNameAr,
    phone: v.phone,
    email: v.email || undefined,
    nationality: v.nationality,
    passportNo: v.passportNo || undefined,
    passportExpiresAt: v.passportExpiresAt || undefined,
    dateOfBirth: v.dateOfBirth || undefined,
    specialRequirements: v.specialRequirements,
    notes: v.notes,
  };
}

/** Blank dates clear the stored value; a blank passport keeps it. */
export function toUpdateInput(v: CustomerFormValues): CustomerUpdateInput {
  return {
    fullName: v.fullName,
    fullNameAr: v.fullNameAr,
    phone: v.phone,
    email: v.email,
    nationality: v.nationality,
    passportNo: passportPatchValue(v.passportNo),
    dateOfBirth: v.dateOfBirth || undefined,
    clearDob: !v.dateOfBirth,
    passportExpiresAt: v.passportExpiresAt || undefined,
    clearPassportExpiry: !v.passportExpiresAt,
    specialRequirements: v.specialRequirements,
    notes: v.notes,
  };
}
