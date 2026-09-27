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
import { useCan } from "@/entities/viewer";
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
  useMutationFeedback,
} from "@/shared/ui";
import { applyFieldErrors } from "@/shared/lib/form-errors";

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
const FIELDS = schema.keyof().options;

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
  const allowed = useCan("packages.write");
  const t = useTranslations("packages");
  const tc = useTranslations("common");
  const feedback = useMutationFeedback();
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
    } catch (err) {
      if (!applyFieldErrors(form.setError, err, FIELDS)) feedback.error(err, t("saveError"));
    }
  }

  if (!allowed) return null;

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
