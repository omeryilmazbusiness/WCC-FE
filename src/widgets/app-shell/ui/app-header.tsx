"use client";

import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { NotificationBell } from "@/features/notifications";
import { LocaleSwitcher } from "@/features/switch-locale";
import { BranchScopeSelect } from "@/features/branch-scope";
import { clearSession } from "@/features/auth-by-credentials";
import { apiLogout } from "@/entities/identity/api";
import { routes } from "@/shared/config/routes";
import { useRouter } from "@/shared/i18n/navigation";
import { Button } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

type Props = {
  className?: string;
};

/**
 * Slim utility bar — branch scope / notifications / locale / logout.
 */
export function AppHeader({ className }: Props) {
  const tNav = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const router = useRouter();

  async function logout() {
    await apiLogout();
    clearSession();
    router.replace(routes.login);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-12 shrink-0 items-center justify-end gap-2 border-b border-zinc-200/70 bg-white/85 px-5 backdrop-blur-md sm:px-8 lg:px-10",
        className,
      )}
    >
      <div className="me-auto">
        <BranchScopeSelect />
      </div>
      <NotificationBell surface="light" />
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
