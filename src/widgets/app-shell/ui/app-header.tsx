"use client";

import { useLocale, useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { AssistantHeaderButton } from "@/features/ai-assistant";
import { NotificationBell } from "@/features/notifications";
import { LocaleSwitcher } from "@/features/switch-locale";
import { BranchScopeSelect } from "@/features/branch-scope";
import { logout as endSession } from "@/features/auth-by-credentials";
import { useCan } from "@/entities/viewer";
import { routes } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import { FxLiveIndicator } from "./fx-live-indicator";

type Props = {
  className?: string;
};

/**
 * Slim utility bar — branch scope / live FX / notifications / locale / logout.
 */
export function AppHeader({ className }: Props) {
  const tNav = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const locale = useLocale();
  const canNotify = useCan("notifications.read");

  async function logout() {
    await endSession();
    window.location.assign(`/${locale}${routes.login}`);
  }

  return (
    <header
      className={cn(
        // Blur lives on ::before: a backdrop-filter on the header itself would stop nested glass popovers from blurring the page.
        "sticky top-0 z-20 isolate flex h-14 shrink-0 items-center justify-end gap-3 border-b border-zinc-950/[0.06] px-5 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-white/80 before:backdrop-blur-xl sm:px-8 lg:px-10",
        className,
      )}
    >
      <div className="me-auto flex min-w-0 flex-1 items-center gap-3">
        <BranchScopeSelect />
      </div>
      <div
        className="flex shrink-0 items-center gap-0.5 rounded-full bg-white p-1 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)] ring-1 ring-zinc-950/[0.06]"
        data-testid="header-actions"
      >
        <FxLiveIndicator />
        <span aria-hidden className="mx-1 h-4 w-px bg-zinc-950/10" />
        <AssistantHeaderButton />
        {canNotify ? <NotificationBell surface="light" /> : null}
        <LocaleSwitcher surface="light" compact />
        <span aria-hidden className="mx-1 h-4 w-px bg-zinc-950/10" />
        <button
          type="button"
          onClick={() => void logout()}
          aria-label={tNav("logout")}
          title={tAuth("sessionEnd")}
          data-testid="header-logout"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors duration-200 hover:bg-zinc-950 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20 rtl:-scale-x-100"
        >
          <LogOut className="h-[15px] w-[15px]" strokeWidth={1.9} />
        </button>
      </div>
    </header>
  );
}
