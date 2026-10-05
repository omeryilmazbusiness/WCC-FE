"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { useLocale } from "next-intl";
import { isRtl } from "@/shared/i18n/routing";
import { cn } from "@/shared/lib/cn";

/** Radix renders `dir="ltr"` on the root unless told otherwise, which would flip RTL pages back. */
export const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ dir, ...props }, ref) => {
  const locale = useLocale();
  return <TabsPrimitive.Root ref={ref} dir={dir ?? (isRtl(locale) ? "rtl" : "ltr")} {...props} />;
});
Tabs.displayName = TabsPrimitive.Root.displayName;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-12 items-center justify-start gap-1 rounded-2xl border border-zinc-200/70 bg-white p-1.5 text-zinc-500 shadow-[0_8px_30px_rgba(0,0,0,0.03)]",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold text-zinc-500 transition-all duration-300 hover:bg-zinc-100 hover:text-zinc-900 data-[state=active]:bg-zinc-950 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:hover:bg-zinc-950 data-[state=active]:hover:text-white",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-6 focus-visible:outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;
