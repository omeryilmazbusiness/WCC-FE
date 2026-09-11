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
  })
  .refine((v) => v.returnDate >= v.departDate, {
    path: ["returnDate"],
    message: "Return must be on or after depart",
  });

type FormValues = z.infer<typeof schema>;

type Props = {
  source: Departure;
  repository: TourPackageRepository;
  onCloned: (d: Departure) => void;
};

export function CloneDepartureDialog({
  source,
  repository,
  onCloned,
}: Props) {
  const t = useTranslations("packages");
  const tc = useTranslations("common");
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: `${source.code}-COPY`,
      departDate: "",
      returnDate: "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const d = await repository.cloneDeparture({
        sourceId: source.id,
        ...values,
      });
      onCloned(d);
      setOpen(false);
      form.reset({
        code: `${source.code}-COPY`,
        departDate: "",
        returnDate: "",
      });
    } catch {
      push({ title: t("saveError"), tone: "error" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {t("clone")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("cloneTitle")}</DialogTitle>
          <DialogDescription>
            {t("cloneHint", { code: source.code })}
          </DialogDescription>
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
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {t("clone")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
