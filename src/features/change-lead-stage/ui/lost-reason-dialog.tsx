"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import {
  LOST_REASON_CODES,
  type Lead,
  type LeadRepository,
} from "@/entities/lead";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";

const schema = z.object({
  code: z.string().min(1),
  note: z.string().optional(),
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
    defaultValues: { code: "price", note: "" },
  });

  useEffect(() => {
    if (open) form.reset({ code: "price", note: "" });
  }, [open, form]);

  async function onSubmit(values: FormValues) {
    if (!lead) return;
    setError(null);
    try {
      const updated = await repository.changeStage(lead.id, {
        stage: "lost",
        lostReasonCode: values.code,
        lostReason: values.note,
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
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("lostReason")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LOST_REASON_CODES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {t(`lostReasons.${code}`)}
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
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("lostNote")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t("lostNoteHint")} />
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
