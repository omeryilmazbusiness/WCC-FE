import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

type ScreenProps = {
  children: ReactNode;
  className?: string;
};

/** Vertical page rhythm — safe for RSC and client views */
export function Screen({ children, className }: ScreenProps) {
  return <div className={cn("space-y-5", className)}>{children}</div>;
}
