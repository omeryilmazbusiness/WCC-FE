"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import type { Customer, CustomerRepository } from "@/entities/customer";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  useToast,
} from "@/shared/ui";

const schema = z.object({
  fullName: z.string().min(2),
  fullNameAr: z.string().optional(),
  phone: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")),
  nationality: z.string().optional(),
  passportNo: z.string().optional(),
  dateOfBirth: z.string().optional(),
  specialRequirements: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  customer: Customer;
  repository: CustomerRepository;
  onSaved?: (customer: Customer) => void;
};

export function EditCustomerDialog({ customer, repository, onSaved }: Props) {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: customer.fullName,
      fullNameAr: customer.fullNameAr ?? "",
      phone: customer.phone,
      email: customer.email ?? "",
      nationality: customer.nationality ?? "",
      passportNo: customer.passportNo ?? "",
      dateOfBirth: customer.dateOfBirth?.slice(0, 10) ?? "",
      specialRequirements: customer.specialRequirements ?? "",
      notes: customer.notes ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const updated = await repository.update(customer.id, {
        fullName: values.fullName,
        fullNameAr: values.fullNameAr,
        phone: values.phone,
        email: values.email || "",
        nationality: values.nationality,
        passportNo: values.passportNo,
        dateOfBirth: values.dateOfBirth || undefined,
        clearDob: !values.dateOfBirth,
        specialRequirements: values.specialRequirements,
        notes: values.notes,
      });
      onSaved?.(updated);
      setOpen(false);
    } catch {
      push({ title: t("saveError"), tone: "error" });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          form.reset({
            fullName: customer.fullName,
            fullNameAr: customer.fullNameAr ?? "",
            phone: customer.phone,
            email: customer.email ?? "",
            nationality: customer.nationality ?? "",
            passportNo: customer.passportNo ?? "",
            dateOfBirth: customer.dateOfBirth?.slice(0, 10) ?? "",
            specialRequirements: customer.specialRequirements ?? "",
            notes: customer.notes ?? "",
          });
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          {t("edit")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
          <DialogDescription>{t("editHint")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            {(
              [
                ["fullName", t("nameEn")],
                ["fullNameAr", t("nameAr")],
                ["phone", t("phone")],
                ["email", t("email")],
                ["nationality", t("nationality")],
                ["passportNo", t("passport")],
              ] as const
            ).map(([name, label]) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Input
                        dir={name === "fullNameAr" ? "rtl" : undefined}
                        type={name === "email" ? "email" : "text"}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("dob")}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="specialRequirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("specialReq")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("notes")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {tc("save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
