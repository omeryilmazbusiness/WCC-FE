"use client";

import { useState } from "react";
import { cn } from "@/shared/lib/cn";
import { colorIndex, initials } from "@/shared/lib/avatar";
import { avatarUrl } from "../api";

const PALETTE = [
  "from-sky-400 to-blue-600",
  "from-violet-400 to-purple-600",
  "from-emerald-400 to-teal-600",
  "from-amber-300 to-orange-500",
  "from-rose-400 to-pink-600",
  "from-indigo-400 to-indigo-600",
];

const SIZE = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-11 w-11 text-[14px]",
  lg: "h-14 w-14 text-[18px]",
  xl: "h-24 w-24 text-[30px]",
} as const;

type Props = {
  id: string;
  name: string;
  /** Viewer's photo version; without it the initials show. */
  avatarVersion?: string | null;
  size?: keyof typeof SIZE;
  className?: string;
};

/** The viewer's photo, falling back to initials on a stable gradient. */
export function UserAvatar({ id, name, avatarVersion, size = "md", className }: Props) {
  const [failed, setFailed] = useState<string | null>(null);
  const showPhoto = Boolean(avatarVersion) && failed !== avatarVersion;
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-semibold text-white",
        SIZE[size],
        PALETTE[colorIndex(id || name, PALETTE.length)],
        className,
      )}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- private, cookie-authenticated image
        <img
          src={avatarUrl(avatarVersion!)}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
          onError={() => setFailed(avatarVersion ?? null)}
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}
