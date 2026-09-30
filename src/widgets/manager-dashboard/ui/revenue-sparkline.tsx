"use client";

import { useId } from "react";
import type { RevenuePoint } from "@/entities/dashboard";

const W = 320;
const H = 96;
const PAD = 4;

/** Running total of collections as a soft area chart (pure SVG, no chart lib). */
export function RevenueSparkline({ points, label }: { points: RevenuePoint[]; label: string }) {
  const gradientId = useId();
  let running = 0;
  const cumulative = points.map((p) => (running += p.amount));
  const max = Math.max(...cumulative, 0);
  const min = Math.min(...cumulative, 0);
  const span = max - min || 1;
  const step = cumulative.length > 1 ? (W - PAD * 2) / (cumulative.length - 1) : 0;
  const coords = cumulative.map((v, i) => [PAD + i * step, H - PAD - ((v - min) / span) * (H - PAD * 2)] as const);
  const line = coords.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = coords[coords.length - 1];
  const area = last ? `${line} L${last[0].toFixed(1)},${H - PAD} L${PAD},${H - PAD} Z` : "";

  return (
    <div className="relative h-24 w-full" role="img" aria-label={label}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(20 184 166)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(20 184 166)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {area ? <path d={area} fill={`url(#${gradientId})`} /> : null}
        {line ? (
          <path
            d={line}
            fill="none"
            stroke="rgb(13 148 136)"
            strokeWidth={2.25}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>
      {last && max > 0 ? (
        <span
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-teal-600 bg-white shadow-[0_0_0_4px_rgba(20,184,166,0.15)]"
          style={{ left: `${(last[0] / W) * 100}%`, top: `${(last[1] / H) * 100}%` }}
        />
      ) : null}
    </div>
  );
}
