import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_10px_24px_-14px_rgba(10,10,10,0.55)] hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-[0_14px_28px_-14px_rgba(10,10,10,0.6)]",
        secondary:
          "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:-translate-y-0.5 hover:bg-zinc-200/80",
        outline:
          "border border-zinc-200/80 bg-white text-[var(--foreground)] shadow-sm hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_8px_24px_-14px_rgba(24,24,27,0.28)]",
        ghost: "hover:bg-zinc-100/80 hover:text-[var(--foreground)]",
        destructive:
          "bg-[var(--destructive)] text-white shadow-sm hover:opacity-90",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-xl px-3.5 text-xs",
        lg: "h-12 rounded-2xl px-7 text-[15px]",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
