import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/features/switch-locale";
import { cn } from "@/shared/lib/cn";

type Props = {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Quiet link under the card (e.g. "Not your workspace?"). */
  aside?: ReactNode;
};

/** Night-aurora sign-in frame: app-icon over a liquid-glass card, "by WCC" at the foot. */
export async function LoginScreen({ icon, title, subtitle, children, aside }: Props) {
  const t = await getTranslations("auth");
  return (
    <div className="night-glass relative isolate flex min-h-dvh flex-col overflow-hidden bg-[#050816] text-white">
      <div aria-hidden className="night-aurora fixed inset-0 -z-10" />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(70%_55%_at_50%_45%,transparent_0%,rgba(5,8,22,0.55)_100%)]"
      />

      <header className="flex justify-end px-5 pt-5 sm:px-8 sm:pt-7">
        <div className="glass-pill flex h-9 items-center rounded-full px-3">
          <LocaleSwitcher surface="dark" />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <section className="animate-setup-stage-in relative w-full max-w-[400px] pt-11">
          <div className="absolute inset-x-0 top-0 z-10 flex justify-center">{icon}</div>
          <div className="liquid-glass rounded-[34px] px-6 pb-7 pt-16 sm:px-8 sm:pb-8">
            <h1 className="text-center text-[26px] font-semibold leading-tight tracking-[-0.02em] text-white sm:text-[28px]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1.5 text-center text-[14px] font-medium text-white/55">{subtitle}</p>
            ) : null}
            <div className="mt-7">{children}</div>
          </div>
          {aside ? <div className="mt-6 text-center text-[13px] font-medium text-white/50">{aside}</div> : null}
        </section>
      </main>

      <footer className="pb-7 text-center text-[11px] font-medium tracking-[0.16em] text-white/35" dir="ltr">
        {t("poweredBy")} <span className="font-semibold text-white/60">WCC</span>
      </footer>
    </div>
  );
}

const ICON_FRAME =
  "relative flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-[26px] shadow-[0_24px_48px_-18px_rgba(0,0,0,0.85),0_0_0_0.5px_rgba(255,255,255,0.22),inset_0_1px_0_rgba(255,255,255,0.35)]";

/** Company logo on a white app-icon tile (logos are drawn for light backgrounds). */
export function LogoIcon({ src, alt }: { src: string; alt: string }) {
  return (
    <div className={cn(ICON_FRAME, "bg-white p-3")}>
      {/* eslint-disable-next-line @next/next/no-img-element -- versioned same-origin bytes, already cached forever */}
      <img src={src} alt={alt} className="h-full w-full object-contain" draggable={false} />
    </div>
  );
}

/** Gradient app-icon with initials when there is no uploaded logo. */
export function MonogramIcon({ label, className }: { label: string; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        ICON_FRAME,
        "bg-[linear-gradient(145deg,#38bdf8_0%,#6366f1_52%,#a855f7_100%)] text-white",
        className,
      )}
    >
      <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
      <span
        className={cn(
          "relative font-semibold tracking-[-0.03em] drop-shadow-[0_2px_6px_rgba(2,6,23,0.35)]",
          label.length > 2 ? "text-[23px]" : "text-[30px]",
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "").slice(0, 2);
  return letters.toLocaleUpperCase() || "W";
}
