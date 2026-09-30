"use client";

import { useEffect, useState } from "react";
import { lockWheelAxis, panIntent, wheelPixels, type WheelLock } from "./scroll-axis";

const INTERACTIVE =
  'a, button, input, textarea, select, label, [draggable="true"], [role="menuitem"], [role="option"], [contenteditable="true"], [data-no-pan]';
const EDGE_ZONE_PX = 96;
const EDGE_MAX_SPEED_PX = 22;

function canScrollY(el: Element, deltaY: number) {
  if (el.scrollHeight <= el.clientHeight) return false;
  const isRoot = el === document.scrollingElement;
  if (!isRoot) {
    const { overflowY } = getComputedStyle(el);
    if (overflowY !== "auto" && overflowY !== "scroll") return false;
  }
  if (deltaY < 0) return el.scrollTop > 0;
  return el.scrollTop + el.clientHeight < el.scrollHeight - 1;
}

/** The nearest element from `target` up to the document that can take a vertical scroll. */
function verticalScroller(target: Element, deltaY: number): Element | null {
  for (let el: Element | null = target; el; el = el.parentElement) {
    if (canScrollY(el, deltaY)) return el;
  }
  const root = document.scrollingElement;
  return root && canScrollY(root, deltaY) ? root : null;
}

/**
 * Makes a horizontally scrolling container feel native with a mouse:
 * - press and drag sideways on any non-interactive area to pan (vertical drags are ignored);
 * - wheel and trackpad gestures are locked to their dominant axis, so a vertical swipe
 *   never nudges the container sideways and a sideways swipe never scrolls a column;
 * - while an HTML5 drag hovers near either edge the container auto-scrolls, so items can
 *   be dropped on off-screen targets.
 * Touch and pen keep native scrolling. Returns a callback ref.
 */
export function useDragScroll<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);

  useEffect(() => {
    if (!node) return;
    const el = node;
    let pointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let startScroll = 0;
    let panning = false;
    let suppressClick = false;
    let wheelLock: WheelLock | null = null;
    let edgeSpeed = 0;
    let edgeFrame = 0;

    function edgeTick() {
      const before = el.scrollLeft;
      el.scrollLeft += edgeSpeed;
      edgeFrame = edgeSpeed && el.scrollLeft !== before ? requestAnimationFrame(edgeTick) : 0;
    }

    function stopEdge() {
      edgeSpeed = 0;
      if (edgeFrame) cancelAnimationFrame(edgeFrame);
      edgeFrame = 0;
    }

    function onDragOver(e: DragEvent) {
      const rect = el.getBoundingClientRect();
      const zone = Math.min(EDGE_ZONE_PX, rect.width / 4);
      let ratio = 0;
      if (e.clientX < rect.left + zone) ratio = -(1 - (e.clientX - rect.left) / zone);
      else if (e.clientX > rect.right - zone) ratio = 1 - (rect.right - e.clientX) / zone;
      edgeSpeed = Math.max(-1, Math.min(1, ratio)) * EDGE_MAX_SPEED_PX;
      if (!edgeSpeed) stopEdge();
      else if (!edgeFrame) edgeFrame = requestAnimationFrame(edgeTick);
    }

    function onDragLeave(e: DragEvent) {
      if (!(e.relatedTarget instanceof Node) || !el.contains(e.relatedTarget)) stopEdge();
    }

    function end() {
      if (pointerId !== null && el.hasPointerCapture(pointerId)) {
        el.releasePointerCapture(pointerId);
      }
      pointerId = null;
      if (panning) {
        panning = false;
        suppressClick = true;
        delete el.dataset.panning;
      }
    }

    function onPointerDown(e: PointerEvent) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      if (el.scrollWidth <= el.clientWidth) return;
      if ((e.target as Element).closest(INTERACTIVE)) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      startScroll = el.scrollLeft;
      suppressClick = false;
    }

    function onPointerMove(e: PointerEvent) {
      if (e.pointerId !== pointerId) return;
      if ((e.buttons & 1) === 0) {
        end();
        return;
      }
      const dx = e.clientX - startX;
      if (!panning) {
        const intent = panIntent(dx, e.clientY - startY);
        if (intent === "pending") return;
        if (intent === "ignore") {
          pointerId = null;
          return;
        }
        panning = true;
        el.dataset.panning = "";
        el.setPointerCapture(e.pointerId);
        window.getSelection()?.removeAllRanges();
      }
      e.preventDefault();
      el.scrollLeft = startScroll - dx;
    }

    function onPointerUp(e: PointerEvent) {
      if (e.pointerId === pointerId) end();
    }

    function onClickCapture(e: MouseEvent) {
      if (!suppressClick) return;
      suppressClick = false;
      e.preventDefault();
      e.stopPropagation();
    }

    function onWheel(e: WheelEvent) {
      if (e.ctrlKey || e.shiftKey) return;
      wheelLock = lockWheelAxis(wheelLock, e.deltaX, e.deltaY, e.timeStamp);
      if (wheelLock.axis === "x") {
        if (e.deltaY === 0) return;
        e.preventDefault();
        el.scrollLeft += wheelPixels(e.deltaX, e.deltaMode, el.clientWidth);
        return;
      }
      if (e.deltaX === 0) return;
      e.preventDefault();
      const dy = wheelPixels(e.deltaY, e.deltaMode, window.innerHeight);
      verticalScroller(e.target as Element, dy)?.scrollBy({ top: dy, behavior: "instant" });
    }

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    el.addEventListener("lostpointercapture", onPointerUp);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", stopEdge, true);
    window.addEventListener("dragend", stopEdge, true);
    return () => {
      end();
      stopEdge();
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("lostpointercapture", onPointerUp);
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", stopEdge, true);
      window.removeEventListener("dragend", stopEdge, true);
    };
  }, [node]);

  return setNode;
}
