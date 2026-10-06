"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { IconInput } from "@/shared/ui";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/** Password input with a show / hide toggle. */
export const PasswordInput = forwardRef<HTMLInputElement, Props>(({ className, ...props }, ref) => {
  const t = useTranslations("settings.profile.password");
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <IconInput ref={ref} icon={KeyRound} type={visible ? "text" : "password"} className={className ? `pe-11 ${className}` : "pe-11"} dir="ltr" {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute end-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        aria-label={visible ? t("hide") : t("show")}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";
