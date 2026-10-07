"use client";

import { useState } from "react";
import { companyLogoUrl, useCompanyBranding } from "@/entities/company-branding";
import { initials } from "@/shared/lib/avatar";
import { cn } from "@/shared/lib/cn";

const TILE = "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[12px]";
const MONOGRAM =
  "bg-gradient-to-b from-zinc-800 to-zinc-950 text-[12px] font-semibold tracking-wide text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_6px_14px_-8px_rgba(0,0,0,0.7)]";

/** The company's uploaded logo; its initials while loading, without a logo, or if the image fails. */
export function CompanyMark({ slug, name }: { slug: string; name: string }) {
  const branding = useCompanyBranding(slug);
  const src = branding ? companyLogoUrl(branding) : null;
  const [failed, setFailed] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);

  if (!src || failed === src) {
    return (
      <span className={cn(TILE, MONOGRAM)} aria-hidden data-testid="company-mark" data-kind="initials">
        {initials(name)}
      </span>
    );
  }
  const ready = loaded === src;
  return (
    <span
      className={cn(TILE, "relative bg-white p-1 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_6px_14px_-10px_rgba(0,0,0,0.4)] ring-1 ring-zinc-950/[0.07]")}
      data-testid="company-mark"
      data-kind="logo"
      data-ready={ready}
    >
      {!ready ? (
        <span className="absolute inset-0 flex items-center justify-center text-[12px] font-semibold tracking-wide text-zinc-400" aria-hidden>
          {initials(name)}
        </span>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element -- versioned same-origin logo, already cached immutable */}
      <img
        src={src}
        alt=""
        className={cn("h-full w-full object-contain transition-opacity duration-300", ready ? "opacity-100" : "opacity-0")}
        draggable={false}
        decoding="async"
        ref={(img) => {
          if (img?.complete && img.naturalWidth > 0 && loaded !== src) setLoaded(src);
        }}
        onLoad={() => setLoaded(src)}
        onError={() => setFailed(src)}
      />
    </span>
  );
}
