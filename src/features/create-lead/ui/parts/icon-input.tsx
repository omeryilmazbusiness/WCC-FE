import { forwardRef, type InputHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Input } from "@/shared/ui";

type Props = InputHTMLAttributes<HTMLInputElement> & { icon: LucideIcon; iconClassName?: string };

/** An input with a leading icon, iOS settings-row style. */
export const IconInput = forwardRef<HTMLInputElement, Props>(({ icon: Icon, iconClassName, className, ...props }, ref) => (
  <div className="relative">
    <Icon
      className={cn("pointer-events-none absolute start-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-400", iconClassName)}
      strokeWidth={2.2}
      aria-hidden
    />
    <Input ref={ref} className={cn("h-12 ps-11 text-[14.5px]", className)} {...props} />
  </div>
));
IconInput.displayName = "IconInput";
