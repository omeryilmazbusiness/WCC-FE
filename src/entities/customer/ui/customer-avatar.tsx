import { colorIndex, initials } from "@/shared/lib/avatar";
import { cn } from "@/shared/lib/cn";
import { TONES, type Tone } from "@/shared/ui";

const AVATAR_TONES: Tone[] = ["sky", "indigo", "violet", "teal", "emerald", "amber", "rose"];

const SIZES = {
  sm: "h-9 w-9 rounded-[14px] text-[12px]",
  md: "h-12 w-12 rounded-[18px] text-[15px]",
  lg: "h-14 w-14 rounded-[20px] text-[17px]",
  xl: "h-24 w-24 rounded-[32px] text-[30px] sm:h-28 sm:w-28 sm:text-[34px]",
} as const;

type Props = {
  id: string;
  name: string;
  size?: keyof typeof SIZES;
  muted?: boolean;
  className?: string;
};

/** Initials on a gradient whose colour stays fixed per customer. */
export function CustomerAvatar({ id, name, size = "md", muted, className }: Props) {
  const tone = muted ? "zinc" : AVATAR_TONES[colorIndex(id, AVATAR_TONES.length)];
  return (
    <span
      className={cn(
        "flex shrink-0 select-none items-center justify-center font-bold tracking-wide",
        SIZES[size],
        TONES[tone].gradient,
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
