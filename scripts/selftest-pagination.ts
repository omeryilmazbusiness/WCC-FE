/**
 * Self-test: shared paging math used by PagedList / Pager (pure).
 * Run: npm run test:pagination
 */

import assert from "node:assert/strict";
import { clampPage, listHeight, pageCountOf, slicePage } from "../src/shared/lib/pagination.ts";

const items = Array.from({ length: 12 }, (_, i) => i + 1);

assert.equal(pageCountOf(0, 5), 1, "empty list still has one page");
assert.equal(pageCountOf(5, 5), 1);
assert.equal(pageCountOf(6, 5), 2);
assert.equal(pageCountOf(12, 0), 12, "page size below 1 is treated as 1");
assert.equal(pageCountOf(Number.NaN, 5), 1);

assert.equal(clampPage(-1, 3), 0);
assert.equal(clampPage(7, 3), 2);
assert.equal(clampPage(1.8, 3), 1);
assert.equal(clampPage(Number.NaN, 3), 0);
assert.equal(clampPage(4, 0), 0);

let s = slicePage(items, 0, 5);
assert.deepEqual(s.items, [1, 2, 3, 4, 5]);
assert.deepEqual([s.page, s.pageCount, s.total, s.from, s.to], [0, 3, 12, 1, 5]);

s = slicePage(items, 2, 5);
assert.deepEqual(s.items, [11, 12], "last page is partial");
assert.deepEqual([s.from, s.to], [11, 12]);

s = slicePage(items, 9, 5);
assert.equal(s.page, 2, "a page past the end clamps (live list shrank)");
assert.deepEqual(s.items, [11, 12]);

s = slicePage([], 3, 5);
assert.deepEqual([s.items.length, s.page, s.pageCount, s.from, s.to], [0, 0, 1, 0, 0]);

assert.equal(listHeight(5, 56, 8), 5 * 56 + 4 * 8);
assert.equal(listHeight(0, 56, 8), 56, "at least one row is reserved");

console.log("pagination selftest OK");
