"use client";

import { useLocale, useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { NotificationBell } from "@/features/notifications";
import { LocaleSwitcher } from "@/features/switch-locale";
import { BranchScopeSelect } from "@/features/branch-scope";
import { GlobalSearch } from "@/features/global-search";
import { logout as endSession } from "@/features/auth-by-credentials";
import { useCan } from "@/entities/viewer";
import { routes } from "@/shared/config/routes";
import { Button } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

type Props = {
  className?: string;
};

/**
 * Slim utility bar — branch scope / search / notifications / locale / logout.
 */
export function AppHeader({ className }: Props) {
  const tNav = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const locale = useLocale();
  const canSearch = useCan("dashboard.read");
  const canNotify = useCan("notifications.read");

  async function logout() {
    await endSession();
    window.location.assign(`/${locale}${routes.login}`);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-12 shrink-0 items-center justify-end gap-2 border-b border-zinc-200/70 bg-white/85 px-5 backdrop-blur-md sm:px-8 lg:px-10",
        className,
      )}
    >
      <div className="me-auto flex min-w-0 flex-1 items-center gap-3">
        <BranchScopeSelect />
        {canSearch ? <GlobalSearch /> : null}
      </div>
      {canNotify ? <NotificationBell surface="light" /> : null}
      <LocaleSwitcher surface="light" compact />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => void logout()}
        aria-label={tNav("logout")}
        title={tAuth("sessionEnd")}
        className="h-9 w-9 text-zinc-400 hover:bg-transparent hover:text-zinc-950"
      >
        <LogOut className="h-4 w-4" strokeWidth={1.75} />
      </Button>
    </header>
  );
}
