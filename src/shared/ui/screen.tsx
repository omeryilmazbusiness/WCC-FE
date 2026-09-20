import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

type ScreenProps = {
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "children" | "className">;

/** Vertical page rhythm — safe for RSC and client views */
export function Screen({ children, className, ...props }: ScreenProps) {
  return (
    <div className={cn("space-y-5", className)} {...props}>
      {children}
    </div>
  );
}
