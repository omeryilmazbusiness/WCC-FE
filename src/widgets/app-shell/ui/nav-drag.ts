import type { DragEvent } from "react";
import type { GuardedRoute } from "@/shared/config/permissions";

/** Private drag type so drops from other apps or page text are ignored. */
export const NAV_DRAG_TYPE = "application/x-wcc-nav";

export type NavDrag = { href: GuardedRoute; origin: "favorite" | "group" };

export function startNavDrag(e: DragEvent, drag: NavDrag, setDrag: (d: NavDrag) => void) {
  e.dataTransfer.setData(NAV_DRAG_TYPE, drag.href);
  e.dataTransfer.setData("text/plain", drag.href);
  e.dataTransfer.effectAllowed = "move";
  setDrag(drag);
}

export function isNavDrag(e: DragEvent): boolean {
  return e.dataTransfer.types.includes(NAV_DRAG_TYPE);
}
