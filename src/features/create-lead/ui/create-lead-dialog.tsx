"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import type { Lead, LeadOwner, LeadRepository } from "@/entities/lead";
import { createCustomerRepository } from "@/entities/customer";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";

const schema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(6),
  source: z.string().optional(),
  ownerId: z.string().min(1),
  customerId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  repository: LeadRepository;
  onCreated: (lead: Lead) => void;
};

export function CreateLeadDialog({ repository, onCreated }: Props) {
  const t = useTranslations("pipeline");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [owners, setOwners] = useState<LeadOwner[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>(
    [],
  );
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      phone: "",
      source: "",
      ownerId: "",
      customerId: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    void repository.listOwners().then((list) => {
      setOwners(list);
      if (list[0] && !form.getValues("ownerId")) {
        form.setValue("ownerId", list[0].id);
      }
    });
    void createCustomerRepository()
      .search("")
      .then((rows) =>
        setCustomers(rows.map((c) => ({ id: c.id, name: c.fullName }))),
      );
  }, [open, repository, form]);

  async function onSubmit(values: FormValues) {
    const owner = owners.find((o) => o.id === values.ownerId);
    if (!owner) return;
    const lead = await repository.create({
      fullName: values.fullName,
      phone: values.phone,
      source: values.source,
      ownerId: owner.id,
      ownerName: owner.name,
      customerId: values.customerId || null,
    });
    onCreated(lead);
    setOpen(false);
    form.reset({
      fullName: "",
      phone: "",
      source: "",
      ownerId: owners[0]?.id ?? "",
      customerId: "",
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">{t("create")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("create")}</DialogTitle>
          <DialogDescription>{t("createHint")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.name")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.phone")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.source")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ownerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.owner")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {owners.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.customer")}</FormLabel>
                  <Select
                    value={field.value || "__none__"}
                    onValueChange={(v) =>
                      field.onChange(v === "__none__" ? "" : v)
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("optionalCustomer")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">{t("noCustomer")}</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
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
