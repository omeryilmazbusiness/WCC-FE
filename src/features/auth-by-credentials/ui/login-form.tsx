"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { ApiError } from "@/shared/api/http-client";
import { homeForRole } from "@/shared/config/routes";
import { useRouter } from "@/shared/i18n/navigation";
import { Button } from "@/shared/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import {
  ApiAuthGateway,
  DemoAuthGateway,
} from "@/features/auth-by-credentials/model/auth-gateway";
import { persistSession } from "@/features/auth-by-credentials/model/session-store";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "manager@wodi.local", password: "ChangeMe123!" },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      let session;
      try {
        session = await new ApiAuthGateway().login(values.email, values.password);
      } catch (err) {
        // Offline / BE down → demo gateway for F1–F4 shell work
        if (err instanceof ApiError || err instanceof TypeError) {
          session = await new DemoAuthGateway().login(
            values.email,
            values.password,
          );
        } else {
          throw err;
        }
      }
      persistSession(session);
      router.replace(homeForRole(session.user.role));
    } catch {
      setError(t("error"));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("email")}</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("password")}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error ? (
          <p className="text-sm text-[var(--destructive)]" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {t("submit")}
        </Button>
      </form>
    </Form>
  );
}
