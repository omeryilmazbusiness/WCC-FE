"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ImageUp, Loader2, Trash2 } from "lucide-react";
import {
  companyLogoUrl,
  createCompanyBrandingApi,
  logoProblem,
  LOGO_TYPES,
  type CompanyBranding,
} from "@/entities/company-branding";
import { useMutationFeedback } from "@/shared/ui";
import { GlassGroup } from "./glass";

type Props = {
  /** Saved company slug (the sign-in page address); empty before the first save. */
  slug: string;
  name: string;
};

const PILL =
  "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-[background-color,transform] duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

export function LogoGroup({ slug, name }: Props) {
  const t = useTranslations("setup.company.logo");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const api = useMemo(() => createCompanyBrandingApi(), []);
  const input = useRef<HTMLInputElement>(null);
  const [branding, setBranding] = useState<CompanyBranding | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    api
      .get(slug)
      .then((b) => active && setBranding(b))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [api, slug]);

  const logo = branding ? companyLogoUrl(branding) : null;
  const initial = (name.trim()[0] ?? "W").toLocaleUpperCase();

  async function run(action: () => Promise<CompanyBranding>, done: string) {
    setBusy(true);
    setProblem(null);
    try {
      setBranding(await action());
      feedback.success(done);
    } catch (err) {
      feedback.error(err, t("error"));
    } finally {
      setBusy(false);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const issue = logoProblem(file);
    if (issue) {
      setProblem(issue === "type" ? t("errorType") : t("errorSize"));
      return;
    }
    void run(() => api.uploadLogo(file), t("uploaded"));
  }

  return (
    <GlassGroup
      title={t("title")}
      footer={
        <>
          {t("hint")}
          {slug ? (
            <>
              {" "}
              <span dir="ltr" data-testid="setup-login-path">
                {t("signInPage", { path: `/${locale}/${slug}/login` })}
              </span>
            </>
          ) : null}
        </>
      }
    >
      <div className="flex items-center gap-4 px-4 py-3.5">
        <div
          className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[18px] shadow-[0_12px_28px_-14px_rgba(0,0,0,0.8),0_0_0_0.5px_rgba(255,255,255,0.2)]"
          data-testid="setup-logo-preview"
        >
          {logo ? (
            <div className="flex h-full w-full items-center justify-center bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- versioned same-origin bytes */}
              <img src={logo} alt={name} className="h-full w-full object-contain" draggable={false} />
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#38bdf8_0%,#6366f1_52%,#a855f7_100%)] text-[24px] font-semibold text-white">
              {initial}
            </div>
          )}
          {busy ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45">
              <Loader2 className="h-5 w-5 animate-spin text-white" strokeWidth={2.25} />
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <input
            ref={input}
            type="file"
            accept={LOGO_TYPES.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={onPick}
            data-testid="setup-logo-input"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className={`${PILL} bg-white text-zinc-950 hover:bg-white/90`}
            data-testid="setup-logo-upload"
          >
            <ImageUp className="h-4 w-4" strokeWidth={2} />
            {busy ? t("uploading") : logo ? t("change") : t("upload")}
          </button>
          {logo ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => api.removeLogo(), t("removed"))}
              className={`${PILL} text-rose-300 hover:bg-rose-500/10`}
              data-testid="setup-logo-remove"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2} />
              {t("remove")}
            </button>
          ) : null}
        </div>
      </div>
      {problem ? (
        <p role="alert" className="px-4 py-2.5 text-[12px] font-medium text-rose-300">
          {problem}
        </p>
      ) : null}
    </GlassGroup>
  );
}
