export type ScrollAxis = "x" | "y";

/** A wheel gesture keeps the axis it started on until it pauses for this long. */
export const WHEEL_GESTURE_GAP_MS = 180;
/** Pointer travel before a press is classified as a horizontal pan or ignored. */
export const PAN_INTENT_PX = 6;

const LINE_HEIGHT_PX = 16;

/** The dominant axis of a movement; ties go to vertical so page scrolling wins. */
export function dominantAxis(dx: number, dy: number): ScrollAxis {
  return Math.abs(dx) > Math.abs(dy) ? "x" : "y";
}

export type WheelLock = { axis: ScrollAxis; at: number };

/** Keeps one axis per gesture so trackpad drift never scrolls the other one. */
export function lockWheelAxis(
  lock: WheelLock | null,
  dx: number,
  dy: number,
  now: number,
): WheelLock {
  if (lock && now - lock.at < WHEEL_GESTURE_GAP_MS) return { axis: lock.axis, at: now };
  return { axis: dominantAxis(dx, dy), at: now };
}

/** Wheel delta in pixels regardless of `deltaMode` (0 pixel, 1 line, 2 page). */
export function wheelPixels(delta: number, mode: number, pagePx: number): number {
  if (mode === 1) return delta * LINE_HEIGHT_PX;
  if (mode === 2) return delta * pagePx;
  return delta;
}

/**
 * Whether a press that moved by (dx, dy) should pan horizontally: `pending` until it
 * travels far enough, then `pan` only if the motion is mostly sideways.
 */
export function panIntent(dx: number, dy: number): "pending" | "pan" | "ignore" {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < PAN_INTENT_PX) return "pending";
  return dominantAxis(dx, dy) === "x" ? "pan" : "ignore";
}
