"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/shared/lib/cn";

type PopoverContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  contentId: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
};

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopover(): PopoverContextValue {
  const ctx = React.useContext(PopoverContext);
  if (!ctx) throw new Error("Popover parts must be used within <Popover>");
  return ctx;
}

type PopoverProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  children: React.ReactNode;
};

/**
 * Non-modal disclosure panel anchored below its trigger (Tab moves through the content,
 * unlike `DropdownMenu`). Escape returns focus to the trigger; outside press closes.
 */
export function Popover({ open: openProp, defaultOpen = false, onOpenChange, className, children }: PopoverProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  const contentId = React.useId();
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setUncontrolled(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );

  const value = React.useMemo(
    () => ({ open, setOpen, contentId, triggerRef, contentRef }),
    [open, setOpen, contentId],
  );

  return (
    <PopoverContext.Provider value={value}>
      <div className={cn("relative inline-flex", className)}>{children}</div>
    </PopoverContext.Provider>
  );
}

export const PopoverTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild = false, onClick, ...props }, forwardedRef) => {
  const { open, setOpen, contentId, triggerRef } = usePopover();
  const Comp = asChild ? Slot : "button";
  const ref = (node: HTMLButtonElement | null) => {
    triggerRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : "button"}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? contentId : undefined}
      data-state={open ? "open" : "closed"}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) setOpen(!open);
      }}
      {...props}
    />
  );
});
PopoverTrigger.displayName = "PopoverTrigger";

type PopoverContentProps = React.HTMLAttributes<HTMLDivElement> & {
  align?: "start" | "end";
};

export function PopoverContent({ align = "end", className, children, ...props }: PopoverContentProps) {
  const { open, setOpen, contentId, triggerRef, contentRef } = usePopover();

  React.useEffect(() => {
    if (!open) return;
    contentRef.current?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (contentRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, setOpen, triggerRef, contentRef]);

  if (!open) return null;

  return (
    <div
      ref={contentRef}
      id={contentId}
      role="dialog"
      tabIndex={-1}
      data-state="open"
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (!next) return;
        if (contentRef.current?.contains(next) || triggerRef.current?.contains(next)) return;
        setOpen(false);
      }}
      className={cn(
        "absolute top-full z-50 mt-2 rounded-[20px] border border-zinc-200/70 bg-white text-zinc-900 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)] outline-none",
        align === "end" ? "end-0" : "start-0",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
