import assert from "node:assert/strict";
import { QueryCache } from "../src/shared/lib/query-cache.ts";

let now = 1_000;
const cache = new QueryCache({ maxEntries: 3, maxAgeMs: 100, now: () => now });

// keys are scoped and stable
const k = (scope: string, ...parts: unknown[]) => QueryCache.keyOf(scope, parts);
assert.equal(k("acme/main", "tasks", "u1"), k("acme/main", "tasks", "u1"));
assert.notEqual(k("acme/main", "tasks"), k("acme/other", "tasks"), "branch scoped");
assert.notEqual(k("a", "x", { q: "" }), k("a", "x", { q: "b" }));

// miss / hit
assert.equal(cache.get(k("s", "a")), undefined);
cache.set(k("s", "a"), [1, 2]);
assert.deepEqual(cache.get(k("s", "a")), [1, 2]);

// age limit
now += 101;
assert.equal(cache.get(k("s", "a")), undefined, "expired entry ignored");
assert.equal(cache.size, 0, "expired entry dropped");

// LRU bound: reading refreshes nothing, writing refreshes recency
cache.set(k("s", "1"), 1);
cache.set(k("s", "2"), 2);
cache.set(k("s", "3"), 3);
cache.set(k("s", "1"), 11);
cache.set(k("s", "4"), 4);
assert.equal(cache.size, 3);
assert.equal(cache.get(k("s", "2")), undefined, "oldest write evicted");
assert.equal(cache.get(k("s", "1")), 11);

// falsy values are real data
cache.set(k("s", "empty"), []);
cache.set(k("s", "zero"), 0);
assert.deepEqual(cache.get(k("s", "empty")), []);
assert.equal(cache.get(k("s", "zero")), 0);

cache.clear();
assert.equal(cache.size, 0);

console.log("query-cache self-test OK");
