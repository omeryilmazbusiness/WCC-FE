import { WCC_LOGO } from "@/shared/config/brand";
import { cn } from "@/shared/lib/cn";

const SIZE = {
  sm: "h-9 w-9 rounded-[12px]",
  lg: "h-[88px] w-[88px] rounded-[26px] shadow-[0_24px_48px_-18px_rgba(0,0,0,0.85),0_0_0_0.5px_rgba(255,255,255,0.22),inset_0_1px_0_rgba(255,255,255,0.35)]",
} as const;

type Props = {
  alt?: string;
  size?: keyof typeof SIZE;
  className?: string;
};

/** Official WODI mark — white W on black, fills the tile. */
export function WodiMark({ alt = "", size = "sm", className }: Props) {
  return (
    <span
      data-testid="wodi-mark"
      aria-hidden={alt ? undefined : true}
      className={cn("relative block shrink-0 overflow-hidden bg-black", SIZE[size], className)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static brand asset */}
      <img src={WCC_LOGO} alt={alt} className="h-full w-full object-cover" draggable={false} />
    </span>
  );
}
