import { cn } from "@/shared/lib/cn";

export type SkeletonVariant = "list" | "table" | "cards" | "board" | "detail" | "lines";

/** One shimmering placeholder shape. */
export function Bone({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton-bone rounded-lg", className)} />;
}

function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-3xl bg-white p-5 shadow-[0_0_0_1px_rgba(228,228,231,0.7),0_1px_2px_rgba(16,24,40,0.03)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

// Fixed widths keep server and client markup identical (no random sizes).
const ROW_WIDTHS = ["w-2/5", "w-1/3", "w-1/2", "w-1/4", "w-2/5", "w-1/3", "w-1/2", "w-1/4"];
const SUB_WIDTHS = ["w-1/5", "w-1/4", "w-1/6", "w-1/5", "w-1/4", "w-1/6", "w-1/5", "w-1/4"];
const COL_WIDTHS = ["w-24", "w-32", "w-20", "w-16", "w-14"];

function ListBody({ rows = 6 }: { rows?: number }) {
  return (
    <Panel className="p-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3.5 rounded-2xl px-3 py-3">
          <Bone className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Bone className={cn("h-3.5", ROW_WIDTHS[i % ROW_WIDTHS.length])} />
            <Bone className={cn("h-3", SUB_WIDTHS[i % SUB_WIDTHS.length])} />
          </div>
          <Bone className="h-6 w-16 shrink-0 rounded-full" />
        </div>
      ))}
    </Panel>
  );
}

function TableBody({ rows = 8 }: { rows?: number }) {
  return (
    <Panel className="p-0">
      <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
        <Bone className="h-9 w-64 max-w-[50%] rounded-xl" />
        <div className="flex-1" />
        <Bone className="h-9 w-24 rounded-xl" />
        <Bone className="h-9 w-24 rounded-xl" />
      </div>
      <div className="flex items-center gap-6 border-b border-zinc-100 px-5 py-3">
        {COL_WIDTHS.map((w, i) => (
          <Bone key={i} className={cn("h-2.5", w, i > 2 && "hidden md:block")} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-6 border-b border-zinc-50 px-5 py-4 last:border-0">
          <div className="flex w-48 items-center gap-3">
            <Bone className="h-8 w-8 shrink-0 rounded-full" />
            <Bone className={cn("h-3.5", r % 2 ? "w-28" : "w-36")} />
          </div>
          {COL_WIDTHS.slice(1).map((w, i) => (
            <Bone key={i} className={cn("h-3", w, i > 1 && "hidden md:block")} />
          ))}
        </div>
      ))}
    </Panel>
  );
}

function CardsBody() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Panel key={i} className="space-y-4">
            <Bone className="h-10 w-10 rounded-xl" />
            <Bone className="h-7 w-16" />
            <Bone className="h-3 w-24" />
          </Panel>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <Panel key={i} className="space-y-3">
            <Bone className="h-4 w-40" />
            <Bone className="h-3 w-full" />
            <Bone className="h-3 w-11/12" />
            <Bone className="h-3 w-4/5" />
            <Bone className="h-32 w-full rounded-2xl" />
          </Panel>
        ))}
      </div>
    </div>
  );
}

function BoardBody() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {[3, 2, 3, 1, 2].map((cards, c) => (
        <div key={c} className="w-72 shrink-0 space-y-3 rounded-3xl bg-zinc-100/60 p-3">
          <div className="flex items-center justify-between px-1 py-1">
            <Bone className="h-3.5 w-24" />
            <Bone className="h-5 w-8 rounded-full" />
          </div>
          {Array.from({ length: cards }, (_, i) => (
            <Panel key={i} className="space-y-3 p-4">
              <Bone className={cn("h-3.5", i % 2 ? "w-3/4" : "w-2/3")} />
              <Bone className="h-3 w-1/2" />
              <div className="flex items-center justify-between pt-1">
                <Bone className="h-6 w-6 rounded-full" />
                <Bone className="h-5 w-14 rounded-full" />
              </div>
            </Panel>
          ))}
        </div>
      ))}
    </div>
  );
}

function DetailBody() {
  return (
    <div className="space-y-5">
      <Panel className="flex items-center gap-4">
        <Bone className="h-14 w-14 shrink-0 rounded-2xl" />
        <div className="flex-1 space-y-2.5">
          <Bone className="h-5 w-56 max-w-full" />
          <Bone className="h-3 w-40" />
        </div>
        <Bone className="hidden h-9 w-28 rounded-xl sm:block" />
      </Panel>
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="space-y-4 lg:col-span-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Bone className="h-3 w-28" />
              <Bone className={cn("h-3.5", ROW_WIDTHS[i])} />
            </div>
          ))}
        </Panel>
        <Panel className="space-y-3">
          <Bone className="h-4 w-32" />
          <Bone className="h-3 w-full" />
          <Bone className="h-3 w-5/6" />
          <Bone className="h-20 w-full rounded-2xl" />
        </Panel>
      </div>
    </div>
  );
}

function LinesBody() {
  return (
    <div className="space-y-2.5 py-2">
      <Bone className="h-3.5 w-2/5" />
      <Bone className="h-3 w-full" />
      <Bone className="h-3 w-11/12" />
      <Bone className="h-3 w-3/4" />
    </div>
  );
}

const BODIES: Record<SkeletonVariant, () => React.ReactNode> = {
  list: () => <ListBody />,
  table: () => <TableBody />,
  cards: () => <CardsBody />,
  board: () => <BoardBody />,
  detail: () => <DetailBody />,
  lines: () => <LinesBody />,
};

type SkeletonProps = {
  variant?: SkeletonVariant;
  /** Announced to assistive tech; not shown. */
  label?: string;
  /** Shown only if loading lasts longer, so fast responses never flash a skeleton. */
  delayMs?: number;
  /** Also sketch the page title (screens that render nothing else while loading). */
  withHeader?: boolean;
  className?: string;
};

/** Layout-shaped loading placeholder for a screen or panel. */
export function Skeleton({
  variant = "list",
  label = "Loading…",
  delayMs = 160,
  withHeader = false,
  className,
}: SkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="loading-state"
      data-variant={variant}
      className={cn("skeleton-reveal w-full", className)}
      style={{ "--skeleton-delay": `${delayMs}ms` } as React.CSSProperties}
    >
      <span className="sr-only">{label}</span>
      {withHeader ? (
        <div className="mb-6 space-y-2.5">
          <Bone className="h-8 w-56 rounded-xl" />
          <Bone className="h-4 w-80 max-w-full" />
        </div>
      ) : null}
      {BODIES[variant]()}
    </div>
  );
}
