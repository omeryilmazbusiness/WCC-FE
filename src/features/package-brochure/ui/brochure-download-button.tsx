"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FileDown, LoaderCircle } from "lucide-react";
import { brochureFilename, type BrochureLang, type TourPackageRepository } from "@/entities/tourpackage";
import { ApiError } from "@/shared/api/http-client";
import { cn } from "@/shared/lib/cn";
import { IconButton, useToast } from "@/shared/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";

type Props = {
  packageId: string;
  code: string;
  repository: TourPackageRepository;
  className?: string;
  size?: "card" | "hero";
};

export function BrochureDownloadButton({ packageId, code, repository, className, size = "card" }: Props) {
  const t = useTranslations("packages.brochure");
  const { push } = useToast();
  const [busy, setBusy] = useState<BrochureLang | null>(null);

  async function download(lang: BrochureLang) {
    if (busy) return;
    setBusy(lang);
    try {
      const file = await repository.downloadBrochure(packageId, lang);
      saveBlob(file.blob, file.filename || brochureFilename(code, lang));
    } catch (err) {
      push({
        title: t("failed"),
        description: err instanceof ApiError ? err.message : undefined,
        tone: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          label={t("download")}
          variant="outline"
          className={cn(
            "rounded-2xl border-white/60 bg-white/90 text-zinc-800 shadow-sm backdrop-blur hover:bg-white",
            size === "hero" ? "h-10 w-10" : "h-9 w-9",
            className,
          )}
          disabled={busy !== null}
          data-testid="package-brochure"
        >
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <FileDown className="h-4 w-4" aria-hidden />}
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem] rounded-2xl p-1.5">
        {(["en", "ar"] as const).map((lang) => (
          <DropdownMenuItem key={lang} onSelect={() => void download(lang)} data-testid={`package-brochure-${lang}`}>
            <span className="flex-1">{t(lang)}</span>
            <span dir="ltr" className="text-[11px] font-semibold text-zinc-400">
              .{lang}.pdf
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
