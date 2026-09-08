"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/shared/i18n/navigation";
import type { AppLocale } from "@/shared/i18n/routing";
import { cn } from "@/shared/lib/cn";

type Props = {
  surface?: "light" | "dark";
  compact?: boolean;
};

/** Frameless EN / AR text toggle */
export function LocaleSwitcher({ surface = "light", compact = false }: Props) {
  const t = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  function setLocale(next: AppLocale) {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={cn(
        "inline-flex items-center gap-1 px-1 text-[11px] font-semibold tracking-wide",
        surface === "dark" ? "text-zinc-500" : "text-zinc-400",
      )}
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={cn(
          "transition-colors duration-200",
          locale === "en"
            ? surface === "dark"
              ? "text-white"
              : "text-zinc-950"
            : surface === "dark"
              ? "hover:text-zinc-300"
              : "hover:text-zinc-600",
          compact && "uppercase",
        )}
      >
        EN
      </button>
      <span className="opacity-40" aria-hidden>
        /
      </span>
      <button
        type="button"
        onClick={() => setLocale("ar")}
        className={cn(
          "transition-colors duration-200",
          locale === "ar"
            ? surface === "dark"
              ? "text-white"
              : "text-zinc-950"
            : surface === "dark"
              ? "hover:text-zinc-300"
              : "hover:text-zinc-600",
          compact && "uppercase",
        )}
      >
        AR
      </button>
    </div>
  );
}
