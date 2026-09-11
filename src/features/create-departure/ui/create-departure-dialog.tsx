"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import type {
  Departure,
  TourPackageRepository,
} from "@/entities/tourpackage";
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

const schema = z
  .object({
    code: z.string().trim().min(2),
    departDate: z.string().min(1),
    returnDate: z.string().min(1),
    capacityTotal: z
      .string()
      .min(1)
      .refine((v) => Number.isInteger(Number(v)) && Number(v) > 0, {
        message: "Capacity must be a positive whole number",
      }),
    basePrice: z
      .string()
      .min(1)
      .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, {
        message: "Price must be zero or greater",
      }),
    currency: z.string().trim().min(1).max(3),
  })
  .refine((v) => v.returnDate >= v.departDate, {
    path: ["returnDate"],
    message: "Return must be on or after depart",
  });

type FormValues = z.infer<typeof schema>;

type Props = {
  packageId: string;
  repository: TourPackageRepository;
  onCreated: (d: Departure) => void;
};

export function CreateDepartureDialog({
  packageId,
  repository,
  onCreated,
}: Props) {
  const t = useTranslations("packages");
  const tc = useTranslations("common");
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
      departDate: "",
      returnDate: "",
      capacityTotal: "40",
      basePrice: "0",
      currency: "USD",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const d = await repository.createDeparture({
        packageId,
        code: values.code,
        departDate: values.departDate,
        returnDate: values.returnDate,
        capacityTotal: Number(values.capacityTotal),
        basePrice: Math.round(Number(values.basePrice) * 100),
        currency: values.currency.toUpperCase(),
      });
      onCreated(d);
      setOpen(false);
      form.reset({
        code: "",
        departDate: "",
        returnDate: "",
        capacityTotal: "40",
        basePrice: "0",
        currency: "USD",
      });
    } catch {
      push({ title: t("saveError"), tone: "error" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">{t("createDeparture")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createDeparture")}</DialogTitle>
          <DialogDescription>{t("createDepartureHint")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.code")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="departDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.departDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="returnDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.returnDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="capacityTotal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.capacity")}</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} step={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="basePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.basePrice")}</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.currency")}</FormLabel>
                    <FormControl>
                      <Input maxLength={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end gap-2">
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
