/**
 * Self-test: DedupingHttpClient — concurrent GETs share one request, TTL reuse, mutations
 * clear the cache, failures are not remembered, entry cap bounds memory (pure, no I/O).
 * Run: npm run test:http
 */

import assert from "node:assert/strict";
import { DedupingHttpClient } from "../src/shared/api/deduping-http-client.ts";
import type { HttpClient, HttpRequestInit } from "../src/shared/api/http-client.ts";

class FakeClient implements HttpClient {
  calls: string[] = [];
  fail = new Set<string>();
  async request<T>(path: string, init: HttpRequestInit = {}): Promise<T> {
    this.calls.push(`${init.method ?? "GET"} ${path}`);
    await Promise.resolve();
    if (this.fail.has(path)) throw new Error(`boom ${path}`);
    return { path, n: this.calls.length } as T;
  }
  async raw(path: string, init: HttpRequestInit = {}): Promise<Response> {
    this.calls.push(`RAW ${init.method ?? "GET"} ${path}`);
    await Promise.resolve();
    if (this.fail.has(path)) throw new Error(`boom ${path}`);
    return new Response(`body ${path}`);
  }
}

let clock = 0;
const setup = (maxEntries = 64) => {
  const inner = new FakeClient();
  const http = new DedupingHttpClient(inner, { ttlMs: 2000, maxEntries, now: () => clock });
  return { inner, http };
};

async function concurrentGetsShareOneRequest() {
  const { inner, http } = setup();
  const [a, b, c] = await Promise.all([http.request("/tasks"), http.request("/tasks"), http.request("/tasks")]);
  assert.equal(inner.calls.length, 1, "three concurrent GETs → one network call");
  assert.equal(a, b);
  assert.equal(b, c);
  await http.request("/leads");
  assert.equal(inner.calls.length, 2, "different paths are separate");
}

async function ttl() {
  const { inner, http } = setup();
  clock = 0;
  await http.request("/x");
  clock = 1999;
  await http.request("/x");
  assert.equal(inner.calls.length, 1, "reused inside TTL");
  clock = 2000;
  await http.request("/x");
  assert.equal(inner.calls.length, 2, "refetched once TTL elapsed");
}

async function mutationsClear() {
  const { inner, http } = setup();
  clock = 0;
  await http.request("/tasks");
  await http.request("/tasks/1/complete", { method: "POST" });
  await http.request("/tasks");
  assert.deepEqual(inner.calls, ["GET /tasks", "POST /tasks/1/complete", "GET /tasks"], "read after write is fresh");
  await http.request("/tasks/1/complete", { method: "POST" });
  await http.request("/tasks/1/complete", { method: "POST" });
  assert.equal(inner.calls.filter((c) => c.startsWith("POST")).length, 3, "mutations are never deduplicated");
  await http.request("/tasks");
  await http.raw("/upload", { method: "POST", body: "x" });
  await http.request("/tasks");
  assert.equal(inner.calls.filter((c) => c === "GET /tasks").length, 4, "raw mutation clears too");
  await http.raw("/export.csv");
  await http.raw("/export.csv");
  assert.equal(inner.calls.filter((c) => c === "RAW GET /export.csv").length, 2, "downloads are not cached");
}

async function failuresNotRemembered() {
  const { inner, http } = setup();
  inner.fail.add("/flaky");
  await assert.rejects(http.request("/flaky"));
  inner.fail.delete("/flaky");
  const ok = await http.request<{ path: string }>("/flaky");
  assert.equal(ok.path, "/flaky");
  assert.equal(inner.calls.length, 2, "a failed GET is retried, not replayed");
}

async function signalBypasses() {
  const { inner, http } = setup();
  const ctrl = new AbortController();
  await http.request("/s", { signal: ctrl.signal });
  await http.request("/s", { signal: ctrl.signal });
  assert.equal(inner.calls.length, 2, "abortable requests are not shared");
}

async function rawInFlightShared() {
  const { inner, http } = setup();
  const [a, b] = await Promise.all([http.raw("/audit-events?limit=50"), http.raw("/audit-events?limit=50")]);
  assert.equal(inner.calls.length, 1, "concurrent raw GETs → one network call");
  assert.notEqual(a, b, "each caller gets its own Response");
  assert.equal(await a.text(), "body /audit-events?limit=50");
  assert.equal(await b.text(), "body /audit-events?limit=50", "both bodies are readable");
  await http.raw("/audit-events?limit=50");
  assert.equal(inner.calls.length, 2, "settled raw responses are not kept");

  inner.fail.add("/r");
  await assert.rejects(Promise.all([http.raw("/r"), http.raw("/r")]));
  inner.fail.delete("/r");
  assert.equal(await (await http.raw("/r")).text(), "body /r", "a failed raw GET is retried");

  const ctrl = new AbortController();
  await Promise.all([http.raw("/s", { signal: ctrl.signal }), http.raw("/s", { signal: ctrl.signal })]);
  assert.equal(inner.calls.filter((c) => c === "RAW GET /s").length, 2, "abortable raw GETs are not shared");
}

async function boundedMemory() {
  const { inner, http } = setup(3);
  clock = 0;
  for (const p of ["/a", "/b", "/c", "/d"]) await http.request(p);
  await http.request("/a");
  assert.equal(inner.calls.length, 5, "oldest entry evicted past maxEntries");
  await http.request("/d");
  assert.equal(inner.calls.length, 5, "recent entries kept");
}

await concurrentGetsShareOneRequest();
await ttl();
await mutationsClear();
await failuresNotRemembered();
await signalBypasses();
await rawInFlightShared();
await boundedMemory();
console.log("http dedupe selftest OK");
