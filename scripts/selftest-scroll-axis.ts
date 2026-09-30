/**
 * Self-test: axis locking behind the kanban board's mouse panning (pure).
 * Vertical drags and swipes must never scroll the board sideways.
 * Run: npm run test:scroll-axis
 */

import assert from "node:assert/strict";
import {
  PAN_INTENT_PX,
  WHEEL_GESTURE_GAP_MS,
  dominantAxis,
  lockWheelAxis,
  panIntent,
  wheelPixels,
} from "../src/shared/lib/scroll-axis.ts";

assert.equal(dominantAxis(10, 2), "x");
assert.equal(dominantAxis(-10, 2), "x");
assert.equal(dominantAxis(2, 10), "y");
assert.equal(dominantAxis(5, 5), "y", "ties favour vertical");

assert.equal(panIntent(2, 1), "pending");
assert.equal(panIntent(PAN_INTENT_PX - 1, 0), "pending");
assert.equal(panIntent(PAN_INTENT_PX, 0), "pan");
assert.equal(panIntent(-20, 4), "pan");
assert.equal(panIntent(3, 20), "ignore", "vertical drag does not pan");
assert.equal(panIntent(10, 10), "ignore", "diagonal drag does not pan");

let lock = lockWheelAxis(null, 1, 30, 0);
assert.equal(lock.axis, "y");
lock = lockWheelAxis(lock, 40, 2, 50);
assert.equal(lock.axis, "y", "drift within a gesture keeps the vertical lock");
lock = lockWheelAxis(lock, 40, 2, 50 + WHEEL_GESTURE_GAP_MS);
assert.equal(lock.axis, "x", "a new gesture after a pause re-decides");
lock = lockWheelAxis(lock, 0, 60, 50 + WHEEL_GESTURE_GAP_MS + 100);
assert.equal(lock.axis, "x", "horizontal gesture stays horizontal");

assert.equal(wheelPixels(3, 0, 800), 3);
assert.equal(wheelPixels(3, 1, 800), 48);
assert.equal(wheelPixels(1, 2, 800), 800);

console.log("scroll axis self-test OK");
