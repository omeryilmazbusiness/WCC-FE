import type { Page, Request } from "@playwright/test";

/** Long-lived responses (SSE) never finish, so Playwright's "networkidle" would wait forever. */
const LONG_LIVED = [/\/api\/proxy\/stream(\?|$)/];

/** Resolves once no short-lived request has been in flight for `idleMs`. */
export function trackNetwork(page: Page) {
  const inflight = new Set<Request>();
  let lastChange = Date.now();
  const isTracked = (req: Request) => !LONG_LIVED.some((re) => re.test(req.url()));
  const done = (req: Request) => {
    if (inflight.delete(req)) lastChange = Date.now();
  };
  page.on("request", (req) => {
    if (!isTracked(req)) return;
    inflight.add(req);
    lastChange = Date.now();
  });
  page.on("requestfinished", done);
  page.on("requestfailed", done);

  return async function settle(idleMs = 500, timeoutMs = 60_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (inflight.size === 0 && Date.now() - lastChange >= idleMs) return;
      await page.waitForTimeout(100);
    }
    throw new Error(`network did not settle: ${[...inflight].map((r) => r.url()).join(", ")}`);
  };
}
