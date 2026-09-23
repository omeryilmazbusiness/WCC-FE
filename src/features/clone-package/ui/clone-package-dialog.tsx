"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import type { TourPackage, TourPackageRepository } from "@/entities/tourpackage";
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
} from "@/shared/ui";

const schema = z.object({
  code: z.string().min(2),
  nameEn: z.string().min(2),
  nameAr: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  source: TourPackage;
  repository: TourPackageRepository;
  onCloned: (pkg: TourPackage) => void;
};

export function ClonePackageDialog({ source, repository, onCloned }: Props) {
  const t = useTranslations("packages");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: `${source.code}-COPY`,
      nameEn: `${source.nameEn} (copy)`,
      nameAr: source.nameAr,
    },
  });

  async function onSubmit(values: FormValues) {
    const pkg = await repository.clonePackage({
      sourceId: source.id,
      code: values.code,
      nameEn: values.nameEn,
      nameAr: values.nameAr,
    });
    onCloned(pkg);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {t("clonePackage")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("clonePackageTitle")}</DialogTitle>
          <DialogDescription>
            {t("clonePackageHint", { code: source.code })}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
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
            <FormField
              control={form.control}
              name="nameEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.nameEn")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {tc("cancel")}
              </Button>
              <Button type="submit">{tc("save")}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
