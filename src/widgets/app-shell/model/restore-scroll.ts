const USER_SCROLL = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

/**
 * Scrolls the window to `y` once the (often still loading) page is tall enough.
 * Gives up after `timeoutMs` at the furthest reachable position, or as soon as
 * the user scrolls on their own. Returns a cancel function.
 */
export function restoreScroll(y: number, timeoutMs = 1500): () => void {
  if (y <= 0) {
    window.scrollTo({ top: 0 });
    return () => {};
  }
  const deadline = performance.now() + timeoutMs;
  let frame = 0;

  const stop = () => {
    cancelAnimationFrame(frame);
    for (const type of USER_SCROLL) window.removeEventListener(type, stop);
  };
  const tick = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max >= y || performance.now() >= deadline) {
      window.scrollTo({ top: Math.min(y, Math.max(0, max)) });
      stop();
      return;
    }
    frame = requestAnimationFrame(tick);
  };

  for (const type of USER_SCROLL) window.addEventListener(type, stop, { passive: true });
  frame = requestAnimationFrame(tick);
  return stop;
}
