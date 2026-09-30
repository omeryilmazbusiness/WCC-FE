"use client";

import { useTranslations } from "next-intl";
import { CalendarPlus, ListTodo, Package, UserPlus, Users, type LucideIcon } from "lucide-react";
import { GlobalSearch } from "@/features/global-search";
import { usePermissions } from "@/entities/viewer";
import { hasPermission, type Permission } from "@/shared/config/permissions";
import { routes } from "@/shared/config/routes";
import { ActionTile, type Tone } from "@/shared/ui";

type QuickAction = {
  key: "lead" | "booking" | "tasks" | "package" | "customers";
  href: string;
  icon: LucideIcon;
  tone: Tone;
  permission: Permission;
};

const QUICK_ACTIONS: readonly QuickAction[] = [
  { key: "lead", href: routes.pipeline, icon: UserPlus, tone: "sky", permission: "leads.write" },
  { key: "booking", href: routes.bookings, icon: CalendarPlus, tone: "emerald", permission: "bookings.write" },
  { key: "tasks", href: routes.tasks, icon: ListTodo, tone: "amber", permission: "tasks.read" },
  { key: "package", href: routes.packages, icon: Package, tone: "violet", permission: "packages.read" },
  { key: "customers", href: routes.customers, icon: Users, tone: "indigo", permission: "customers.read" },
];

/** Search plus permission-filtered shortcuts, shown at the top of the dashboard. */
export function CommandBar() {
  const t = useTranslations("manager");
  const granted = usePermissions();
  const actions = QUICK_ACTIONS.filter((a) => hasPermission(granted, a.permission));

  return (
    <section
      className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-8"
      data-testid="manager-command-bar"
    >
      <GlobalSearch variant="hero" className="lg:flex-1" />
      {actions.length ? (
        <nav className="flex flex-wrap items-start justify-center gap-2 lg:justify-end" data-testid="manager-quick-actions">
          {actions.map((a) => (
            <ActionTile key={a.key} size="lg" href={a.href} icon={a.icon} tone={a.tone} label={t(`quick.${a.key}`)} />
          ))}
        </nav>
      ) : null}
    </section>
  );
}
