"use client";

import { useTranslations } from "next-intl";
import {
  Building2,
  LayoutDashboard,
  Users,
  Briefcase,
  Kanban,
  Package,
  ListTodo,
  Shield,
  KeyRound,
  ScrollText,
} from "lucide-react";
import type { SessionUser } from "@/shared/api/session";
import { SessionUserProvider } from "@/shared/api/session-context";
import { canAccessAdmin, routes } from "@/shared/config/routes";
import { Link, usePathname } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { ToastProvider } from "@/shared/ui";
import { isManagerRole } from "@/entities/user";
import { SessionExpiryWatcher } from "@/features/auth-by-credentials/ui/session-expiry-watcher";
import { AppHeader } from "./app-header";

type Props = {
  user: SessionUser;
  children: React.ReactNode;
};

export function AppShell({ user, children }: Props) {
  const t = useTranslations("nav");
  const ta = useTranslations("app");
  const pathname = usePathname();
  const manager = isManagerRole(user.role);
  const admin = canAccessAdmin(user.role);

  const items = [
    manager
      ? { href: routes.manager, label: t("manager"), icon: LayoutDashboard }
      : { href: routes.workspace, label: t("workspace"), icon: Briefcase },
    { href: routes.pipeline, label: t("pipeline"), icon: Kanban },
    { href: routes.tasks, label: t("tasks"), icon: ListTodo },
    { href: routes.customers, label: t("customers"), icon: Users },
    { href: routes.packages, label: t("packages"), icon: Package },
    ...(admin
      ? [
          { href: routes.adminUsers, label: t("users"), icon: Shield },
          { href: routes.adminRoles, label: t("roles"), icon: KeyRound },
          { href: routes.adminAudit, label: t("audit"), icon: ScrollText },
        ]
      : []),
  ];

  return (
    <SessionUserProvider user={user}>
      <ToastProvider>
        <SessionExpiryWatcher />
        <div className="flex min-h-screen bg-[#F9FAFB]">
          <aside className="sticky top-0 flex h-screen w-[var(--shell-width)] shrink-0 flex-col bg-zinc-950 text-white">
            <div className="flex h-12 items-center gap-2.5 border-b border-white/10 px-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-zinc-950 shadow-sm">
                <Building2 className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold tracking-tight">
                  {ta("shortName")}
                </p>
                <p className="truncate text-[10px] font-medium text-zinc-500">
                  {ta("name")}
                </p>
              </div>
            </div>

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2.5 py-3">
              {items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all duration-300",
                      active
                        ? "bg-white text-zinc-950 shadow-sm"
                        : "text-zinc-400 hover:bg-white/8 hover:text-white",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
                        active
                          ? "bg-zinc-950 text-white"
                          : "bg-white/10 text-white group-hover:bg-white/15",
                      )}
                    >
                      <Icon className="h-[17px] w-[17px]" strokeWidth={1.75} />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-white/10 px-4 py-3">
              <p className="truncate text-[12px] font-medium text-zinc-300">
                {user.fullName}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                {user.role}
              </p>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <AppHeader />
            <main className="mx-auto w-full max-w-[1400px] flex-1 px-5 py-6 sm:px-8 sm:py-7 lg:px-10">
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
    </SessionUserProvider>
  );
}
