import { ROLE_LOOK } from "@/entities/identity";
import type { AppRole } from "@/shared/config/routes";
import { initials } from "@/shared/lib/avatar";
import { cn } from "@/shared/lib/cn";
import { TONES } from "@/shared/ui";

type Props = { name: string; role: AppRole; dimmed?: boolean; className?: string };

/** Rounded-square initials tile tinted by role, with the role icon as a corner badge. */
export function MemberAvatar({ name, role, dimmed, className }: Props) {
  const look = ROLE_LOOK[role] ?? ROLE_LOOK.employee;
  const Icon = look.icon;
  return (
    <span className={cn("relative inline-flex shrink-0", className)} aria-hidden>
      <span
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-[20px] text-[17px] font-semibold tracking-tight",
          dimmed ? "bg-zinc-100 text-zinc-400" : TONES[look.tone].gradient,
        )}
      >
        {initials(name)}
      </span>
      <span className="absolute -bottom-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-zinc-900/[0.06]">
        <Icon className={cn("h-3.5 w-3.5", dimmed ? "text-zinc-400" : TONES[look.tone].text)} strokeWidth={2.4} />
      </span>
    </span>
  );
}
