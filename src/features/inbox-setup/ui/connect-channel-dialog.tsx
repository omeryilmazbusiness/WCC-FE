"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, ExternalLink } from "lucide-react";
import type {
  ChannelHealth,
  ConnectCredentials,
  SocialChannel,
} from "@/entities/conversation";
import { env } from "@/shared/config/env";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@/shared/ui";

type FieldKey =
  | "display_name"
  | "access_token"
  | "phone_number_id"
  | "waba_id"
  | "display_phone"
  | "page_id"
  | "ig_user_id"
  | "client_id"
  | "client_secret"
  | "refresh_token"
  | "mailbox_email"
  | "verify_token";

type FieldDef = {
  key: FieldKey;
  required?: boolean;
  secret?: boolean;
  type?: "email" | "text";
};

const FIELDS: Record<SocialChannel, FieldDef[]> = {
  whatsapp: [
    { key: "display_name" },
    { key: "access_token", required: true, secret: true },
    { key: "phone_number_id", required: true },
    { key: "waba_id" },
    { key: "display_phone" },
    { key: "verify_token" },
  ],
  instagram: [
    { key: "display_name" },
    { key: "access_token", required: true, secret: true },
    { key: "page_id", required: true },
    { key: "ig_user_id", required: true },
    { key: "verify_token" },
  ],
  facebook: [
    { key: "display_name" },
    { key: "access_token", required: true, secret: true },
    { key: "page_id", required: true },
    { key: "verify_token" },
  ],
  gmail: [
    { key: "display_name" },
    { key: "mailbox_email", required: true, type: "email" },
    { key: "client_id", required: true },
    { key: "client_secret", required: true, secret: true },
    { key: "refresh_token", required: true, secret: true },
  ],
};

type Props = {
  open: boolean;
  channel: SocialChannel | null;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (credentials: ConnectCredentials) => Promise<ChannelHealth | void>;
};

export function ConnectChannelDialog({
  open,
  channel,
  busy,
  onOpenChange,
  onSubmit,
}: Props) {
  const t = useTranslations("inboxSetup.connectDialog");
  const [values, setValues] = useState<Partial<Record<FieldKey, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChannelHealth | null>(null);
  const [copied, setCopied] = useState<"url" | "verify" | null>(null);

  const fields = channel ? FIELDS[channel] : [];

  const webhookAbsolute = useMemo(() => {
    if (!result) return "";
    const path =
      result.webhookUrl ??
      result.webhookPath ??
      (channel ? `/v1/webhooks/${channel}` : "");
    if (!path) return "";
    if (path.startsWith("http")) return path;
    const origin = env.apiBaseUrl.replace(/\/v1\/?$/, "").replace(/\/$/, "");
    return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
  }, [result, channel]);

  const verifyToken = result?.publicMeta?.verify_token ?? "";

  function reset() {
    setValues({});
    setError(null);
    setResult(null);
    setCopied(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!channel) return;
    setError(null);
    for (const f of fields) {
      if (f.required && !String(values[f.key] ?? "").trim()) {
        setError(t("missingRequired"));
        return;
      }
    }
    const credentials: ConnectCredentials = {};
    for (const f of fields) {
      const v = String(values[f.key] ?? "").trim();
      if (v) credentials[f.key] = v;
    }
    try {
      const health = await onSubmit(credentials);
      if (health) setResult(health);
      else handleOpenChange(false);
    } catch {
      setError(t("submitError"));
    }
  }

  async function copy(kind: "url" | "verify", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      /* ignore */
    }
  }

  if (!channel) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-md overflow-y-auto"
        data-testid={`connect-dialog-${channel}`}
      >
        <DialogHeader>
          <DialogTitle>{t(`titles.${channel}`)}</DialogTitle>
          <DialogDescription>{t(`descriptions.${channel}`)}</DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700">
              <Check className="h-4 w-4 shrink-0" />
              {t("success")}
            </div>

            {webhookAbsolute ? (
              <div className="space-y-1.5">
                <Label>{t("webhookUrl")}</Label>
                <p className="text-[11px] leading-relaxed text-zinc-500">
                  {t("webhookHint")}
                </p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={webhookAbsolute}
                    className="h-10 font-mono text-[11px]"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-10 shrink-0"
                    onClick={() => void copy("url", webhookAbsolute)}
                  >
                    {copied === "url" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            ) : null}

            {verifyToken && channel !== "gmail" ? (
              <div className="space-y-1.5">
                <Label>{t("verifyToken")}</Label>
                <p className="text-[11px] leading-relaxed text-zinc-500">
                  {t("verifyHint")}
                </p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={verifyToken}
                    className="h-10 font-mono text-[11px]"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-10 shrink-0"
                    onClick={() => void copy("verify", verifyToken)}
                  >
                    {copied === "verify" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            ) : null}

            <a
              href={t(`docs.${channel}`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 underline-offset-2 hover:underline"
            >
              {t("docsLink")}
              <ExternalLink className="h-3 w-3" />
            </a>

            <Button
              type="button"
              className="h-9 w-full"
              onClick={() => handleOpenChange(false)}
              data-testid="connect-dialog-done"
            >
              {t("done")}
            </Button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3.5">
            <p className="rounded-xl bg-zinc-50 px-3 py-2 text-[12px] leading-relaxed text-zinc-600">
              {t(`help.${channel}`)}
            </p>

            {fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={`conn-${channel}-${f.key}`}>
                  {t(`fields.${f.key}`)}
                  {f.required ? (
                    <span className="ms-1 text-rose-500">*</span>
                  ) : (
                    <span className="ms-1 text-[11px] font-medium text-zinc-400">
                      {t("optional")}
                    </span>
                  )}
                </Label>
                <Input
                  id={`conn-${channel}-${f.key}`}
                  type={f.secret ? "password" : f.type === "email" ? "email" : "text"}
                  autoComplete="off"
                  spellCheck={false}
                  className="h-10"
                  placeholder={t(`placeholders.${f.key}`)}
                  value={values[f.key] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                  }
                  data-testid={`connect-field-${f.key}`}
                />
              </div>
            ))}

            {error ? (
              <p className="text-sm font-medium text-rose-600" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 flex-1"
                onClick={() => handleOpenChange(false)}
                disabled={busy}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-9 flex-1"
                disabled={busy}
                data-testid="connect-dialog-submit"
              >
                {busy ? t("saving") : t("save")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
