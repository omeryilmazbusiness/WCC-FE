/**
 * Self-test: realtime stream client — SSE parsing across chunk boundaries, signal mapping,
 * topic prefixes, shared connection lifecycle, reconnect/backoff, token-expiry reconnect,
 * terminal stop on 401 (pure, fake fetch + timers).
 * Run: npm run test:realtime
 */

import assert from "node:assert/strict";
import {
  createSseParser,
  parseSignal,
  RealtimeConnection,
  topicMatches,
  type RealtimeSignal,
  type RealtimeStatus,
  type SseEvent,
} from "../src/shared/api/realtime-connection.ts";

function parserHandlesChunksAndComments() {
  const got: SseEvent[] = [];
  const p = createSseParser((e) => got.push(e));
  p.push("retry: 3000\nevent: rea");
  p.push("dy\ndata: {}\n\n: ping\n\n");
  p.push('event: notification\r\ndata: {"topic":"task.overdue",\r\ndata: "user_id":"u1"}\r\n\r\n');
  p.push("data: plain");
  assert.deepEqual(got, [
    { event: "ready", data: "{}" },
    { event: "notification", data: '{"topic":"task.overdue",\n"user_id":"u1"}' },
  ]);
  p.push("\n\n");
  assert.deepEqual(got[2], { event: "message", data: "plain" }, "unterminated event waits for its blank line");
}

function signalMapping() {
  assert.deepEqual(parseSignal({ event: "invalidate", data: '{"type":"invalidate","branch_id":"b1","topic":"payment.recorded"}' }), {
    type: "invalidate",
    topic: "payment.recorded",
    userId: undefined,
    branchId: "b1",
  });
  assert.equal(parseSignal({ event: "invalidate", data: "not json" }), null);
  assert.equal(parseSignal({ event: "invalidate", data: "{}" }), null, "topic is required");
  assert.equal(parseSignal({ event: "ready", data: "{}" }), null);
}

function topics() {
  assert.ok(topicMatches("task.overdue", ["task"]));
  assert.ok(topicMatches("task", ["task"]));
  assert.ok(!topicMatches("tasks.x", ["task"]), "prefix stops at a dot");
  assert.ok(topicMatches("payment.recorded", ["lead", "payment.recorded"]));
}

/** A scripted stream: each connect pops the next script (status + chunks, or a thrown error). */
type Script = { status?: number; chunks?: string[]; hang?: boolean } | "throw";

function harness(scripts: Script[]) {
  const connects: number[] = [];
  const sleeps: number[] = [];
  const statuses: RealtimeStatus[] = [];
  const signals: RealtimeSignal[] = [];
  let cleared = 0;
  let cancels = 0;
  const fakeFetch = (async (_url: string, init?: RequestInit) => {
    connects.push(connects.length);
    const script = scripts.shift() ?? { hang: true };
    if (script === "throw") throw new TypeError("network");
    const enc = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(ctrl) {
        for (const c of script.chunks ?? []) ctrl.enqueue(enc.encode(c));
        if (script.hang) {
          init?.signal?.addEventListener("abort", () => ctrl.error(new Error("aborted")));
        } else {
          ctrl.close();
        }
      },
      cancel() {
        cancels++;
      },
    });
    return new Response(body, { status: script.status ?? 200 });
  }) as typeof fetch;
  const conn = new RealtimeConnection({
    url: "/api/proxy/stream",
    fetch: fakeFetch,
    sleep: async (ms, signal) => {
      if (ms !== GRACE_MS) {
        sleeps.push(ms);
        return;
      }
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, ms);
        signal.addEventListener("abort", () => {
          clearTimeout(t);
          reject(new Error("aborted"));
        });
      });
    },
    random: () => 0.5,
    beforeDispatch: () => cleared++,
    baseDelayMs: 1000,
    maxDelayMs: 8000,
    expiryGraceMs: GRACE_MS,
  });
  conn.onStatus((s) => statuses.push(s));
  return { conn, connects, sleeps, statuses, signals, cleared: () => cleared, cancels: () => cancels };
}

const GRACE_MS = 20;

const tick = () => new Promise((r) => setTimeout(r, 5));

async function deliversSignalsAndSharesOneStream() {
  const h = harness([
    {
      hang: true,
      chunks: [
        "retry: 3000\nevent: ready\ndata: {}\n\n",
        'event: invalidate\ndata: {"topic":"task.overdue","branch_id":"b1"}\n\n',
        'event: notification\ndata: {"topic":"task.overdue","user_id":"u1"}\n\n',
      ],
    },
  ]);
  const a: RealtimeSignal[] = [];
  const b: RealtimeSignal[] = [];
  const offA = h.conn.subscribe((s) => a.push(s));
  const offB = h.conn.subscribe((s) => {
    b.push(s);
    throw new Error("listener bug");
  });
  await tick();
  assert.equal(h.connects.length, 1, "two subscribers share one stream");
  assert.equal(h.conn.status, "open");
  assert.deepEqual(a.map((s) => s.type), ["invalidate", "notification"], "a throwing listener does not starve others");
  assert.equal(b.length, 2);
  assert.equal(h.cleared(), 2, "cached reads dropped before each dispatch");
  offA();
  assert.equal(h.conn.status, "open", "still open while a subscriber remains");
  offB();
  assert.equal(h.conn.status, "idle", "last unsubscribe closes the stream");
}

async function backoffThenRecovers() {
  const h = harness(["throw", { status: 503 }, "throw", { hang: true, chunks: ["event: ready\ndata: {}\n\n"] }]);
  const off = h.conn.subscribe(() => undefined);
  await tick();
  assert.equal(h.connects.length, 4);
  assert.deepEqual(h.sleeps, [1500, 3000, 6000], "jittered exponential backoff (random fixed at 0.5)");
  assert.equal(h.conn.status, "open");
  off();
}

async function expiredReconnectsImmediately() {
  const h = harness([
    { chunks: ["event: ready\ndata: {}\n\n", "event: expired\ndata: {}\n\n"] },
    { hang: true, chunks: ["event: ready\ndata: {}\n\n"] },
  ]);
  const off = h.conn.subscribe(() => undefined);
  await tick();
  assert.equal(h.connects.length, 2, "token expiry → new stream");
  assert.deepEqual(h.sleeps, [], "no delay after expiry");
  assert.equal(h.cancels(), 0, "a stream the server ended after expiry is not cancelled");
  off();
}

async function expiredHangingStreamIsCancelledAfterGrace() {
  const h = harness([
    { chunks: ["event: ready\ndata: {}\n\n", "event: expired\ndata: {}\n\n"], hang: true },
    { hang: true, chunks: ["event: ready\ndata: {}\n\n"] },
  ]);
  const off = h.conn.subscribe(() => undefined);
  await tick();
  assert.equal(h.connects.length, 1, "waits for the server to end the response");
  await new Promise((r) => setTimeout(r, GRACE_MS * 3));
  assert.equal(h.connects.length, 2, "reconnects once the grace period ran out");
  assert.equal(h.cancels(), 1, "the held-open response is cancelled");
  assert.deepEqual(h.sleeps, [], "no backoff after expiry");
  off();
}

async function cleanCloseWaitsBaseDelay() {
  const h = harness([{ chunks: ["event: ready\ndata: {}\n\n"] }, { hang: true }]);
  const off = h.conn.subscribe(() => undefined);
  await tick();
  assert.deepEqual(h.sleeps, [1000], "server closed an opened stream → base delay");
  off();
}

async function unauthorizedStops() {
  const h = harness([{ status: 401 }]);
  const off = h.conn.subscribe(() => undefined);
  await tick();
  assert.equal(h.conn.status, "stopped");
  assert.equal(h.connects.length, 1, "no retry after 401");
  const off2 = h.conn.subscribe(() => undefined);
  await tick();
  assert.equal(h.connects.length, 1, "new subscribers do not restart a stopped stream");
  off();
  off2();
}

parserHandlesChunksAndComments();
signalMapping();
topics();
await deliversSignalsAndSharesOneStream();
await backoffThenRecovers();
await expiredReconnectsImmediately();
await expiredHangingStreamIsCancelledAfterGrace();
await cleanCloseWaitsBaseDelay();
await unauthorizedStops();
console.log("realtime selftest OK");
