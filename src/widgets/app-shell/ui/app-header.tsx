"use client";

import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { NotificationBell } from "@/features/notifications";
import { LocaleSwitcher } from "@/features/switch-locale";
import { clearSession } from "@/features/auth-by-credentials";
import { routes } from "@/shared/config/routes";
import { useRouter } from "@/shared/i18n/navigation";
import { Button } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

type Props = {
  className?: string;
};

/**
 * Slim utility bar — notifications / locale / logout only.
 * Screen titles always live under the header via PageHeader / ListScreen.
 */
export function AppHeader({ className }: Props) {
  const tNav = useTranslations("nav");
  const router = useRouter();

  function logout() {
    clearSession();
    router.replace(routes.login);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-12 shrink-0 items-center justify-end gap-1 border-b border-zinc-200/70 bg-white/85 px-5 backdrop-blur-md sm:px-8 lg:px-10",
        className,
      )}
    >
      <NotificationBell surface="light" />
      <LocaleSwitcher surface="light" compact />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={logout}
        aria-label={tNav("logout")}
        className="h-9 w-9 text-zinc-400 hover:bg-transparent hover:text-zinc-950"
      >
        <LogOut className="h-4 w-4" strokeWidth={1.75} />
      </Button>
    </header>
  );
}
