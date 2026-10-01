import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { TONES, type Tone } from "./tone";

type Common = {
  label: string;
  icon: LucideIcon;
  tone?: Tone;
  /** Second line under the label. */
  hint?: ReactNode;
  /** Highlights the tile as the current choice. */
  active?: boolean;
  loading?: boolean;
  /** `row` puts the icon beside the label for full-width tiles. */
  layout?: "stack" | "row";
  className?: string;
};

type AsButton = Common & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & { href?: undefined };
type AsLink = Common & { href: string; "data-testid"?: string };

const SHELL =
  "group relative flex min-w-0 rounded-[20px] bg-zinc-50/80 text-zinc-800 ring-1 ring-inset ring-zinc-900/[0.04] transition-[background-color,box-shadow,transform] duration-200 hover:bg-white hover:shadow-[0_10px_24px_-16px_rgba(15,23,42,0.35)] hover:ring-zinc-900/[0.06] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/15 disabled:pointer-events-none disabled:opacity-50";

/** iOS Control Center style action: tinted squircle icon over a short label. */
export function ControlTile(props: AsButton | AsLink) {
  const { label, icon: Icon, tone = "sky", hint, active, loading, layout = "stack", className } = props;
  const body = (
    <>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-[14px] transition-transform duration-200 group-hover:-translate-y-px",
          layout === "stack" ? "h-11 w-11" : "h-10 w-10",
          active ? TONES[tone].gradient : TONES[tone].soft,
        )}
        aria-hidden
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" strokeWidth={2} />}
      </span>
      <span className={cn("min-w-0", layout === "stack" ? "w-full text-center" : "flex-1 text-start")}>
        <span className="block truncate text-[12.5px] font-semibold leading-4">{label}</span>
        {hint ? <span className="mt-0.5 block truncate text-[11px] font-medium text-zinc-400">{hint}</span> : null}
      </span>
    </>
  );
  const shell = cn(
    SHELL,
    layout === "stack" ? "flex-col items-center gap-2 px-2 pb-2.5 pt-3" : "items-center gap-3 px-3 py-2.5",
    active && "bg-white shadow-[0_10px_24px_-16px_rgba(15,23,42,0.35)] ring-zinc-900/10",
    className,
  );

  if (props.href !== undefined) {
    return (
      <Link href={props.href} title={label} className={shell} data-testid={props["data-testid"]}>
        {body}
      </Link>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { label: _l, icon: _i, tone: _t, hint: _h, active: _a, loading: _lo, layout: _la, className: _c, href: _href, ...rest } = props;
  return (
    <button type="button" title={label} aria-pressed={active} {...rest} className={shell}>
      {body}
    </button>
  );
}
