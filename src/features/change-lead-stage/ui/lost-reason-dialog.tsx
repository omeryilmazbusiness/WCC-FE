"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import type { Lead, LeadRepository } from "@/entities/lead";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@/shared/ui";

const schema = z.object({
  reason: z.string().min(2),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  repository: LeadRepository;
  onDone: (lead: Lead) => void;
};

export function LostReasonDialog({
  open,
  onOpenChange,
  lead,
  repository,
  onDone,
}: Props) {
  const t = useTranslations("pipeline");
  const tc = useTranslations("common");
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "" },
  });

  async function onSubmit(values: FormValues) {
    if (!lead) return;
    setError(null);
    try {
      const updated = await repository.changeStage(lead.id, {
        stage: "lost",
        lostReason: values.reason,
      });
      onDone(updated);
      onOpenChange(false);
      form.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("stageError"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("lostReasonTitle")}</DialogTitle>
          <DialogDescription>
            {lead ? t("lostReasonHint", { name: lead.fullName }) : null}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("lostReason")}</FormLabel>
                  <FormControl>
                    <Input {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error ? (
              <p className="text-sm text-[var(--destructive)]">{error}</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {t("markLost")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
