import * as React from "react";
import { cn } from "@/shared/lib/cn";
import { Button, type ButtonProps } from "@/shared/ui/button";

type IconButtonProps = ButtonProps & {
  label: string;
};

/** Accessible icon-only button — always pass `label` for a11y */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, className, children, ...props }, ref) => (
    <Button
      ref={ref}
      size="icon"
      aria-label={label}
      className={cn(className)}
      {...props}
    >
      {children}
      <span className="sr-only">{label}</span>
    </Button>
  ),
);
IconButton.displayName = "IconButton";
