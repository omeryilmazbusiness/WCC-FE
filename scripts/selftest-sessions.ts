/**
 * Self-test: BFF 401 decision policy + active-session user-agent parser (pure, no I/O).
 * Run: npm run test:sessions
 */

import assert from "node:assert/strict";
import {
  decideOnUnauthorized,
  sessionEndOnRefreshFailure,
  sessionEndReasonFor,
} from "../src/shared/api/server/unauthorized-policy.ts";
import { parseUserAgent } from "../src/features/manage-sessions/lib/user-agent.ts";

const fresh = { refreshed: false, hasRefreshToken: true };

function policy() {
  assert.deepEqual(decideOnUnauthorized("session_revoked", fresh), { action: "end", reason: "revoked" });
  assert.deepEqual(decideOnUnauthorized("token_stale", fresh), { action: "refresh", reloadViewer: true });
  assert.deepEqual(decideOnUnauthorized("unauthorized", fresh), { action: "refresh", reloadViewer: false });
  assert.deepEqual(decideOnUnauthorized(undefined, fresh), { action: "refresh", reloadViewer: false });

  // Max one refresh per request: a 401 after refreshing always ends the session.
  for (const code of ["token_stale", "unauthorized", undefined]) {
    assert.deepEqual(decideOnUnauthorized(code, { refreshed: true, hasRefreshToken: true }), {
      action: "end",
      reason: "expired",
    });
    assert.deepEqual(decideOnUnauthorized(code, { refreshed: false, hasRefreshToken: false }), {
      action: "end",
      reason: "expired",
    });
  }
  assert.deepEqual(decideOnUnauthorized("session_revoked", { refreshed: true, hasRefreshToken: true }), {
    action: "end",
    reason: "revoked",
  });

  assert.equal(sessionEndReasonFor("session_revoked"), "revoked");
  assert.equal(sessionEndReasonFor("token_stale"), "expired");

  assert.equal(sessionEndOnRefreshFailure({ status: 401, code: "unauthorized", network: false }), "expired");
  assert.equal(sessionEndOnRefreshFailure({ status: 400, code: "validation_error", network: false }), "expired");
  assert.equal(sessionEndOnRefreshFailure({ status: 401, code: "session_revoked", network: false }), "revoked");
  assert.equal(sessionEndOnRefreshFailure({ status: 503, code: "upstream_unavailable", network: true }), null);
  assert.equal(sessionEndOnRefreshFailure({ status: 500, code: "internal_error", network: false }), null);
}

function userAgents() {
  const cases: [string, string | null, string | null, boolean][] = [
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      "Chrome",
      "macOS",
      false,
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
      "Edge",
      "Windows",
      false,
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1",
      "Safari",
      "iOS",
      true,
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1",
      "Chrome",
      "iOS",
      true,
    ],
    [
      "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
      "Samsung Internet",
      "Android",
      true,
    ],
    ["Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0", "Firefox", "Linux", false],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 OPR/114.0.0.0",
      "Opera",
      "Windows",
      false,
    ],
    ["curl/8.7.1", null, null, false],
    ["", null, null, false],
  ];
  for (const [ua, browser, os, mobile] of cases) {
    assert.deepEqual(parseUserAgent(ua), { browser, os, mobile }, ua);
  }
  assert.deepEqual(parseUserAgent(undefined), { browser: null, os: null, mobile: false });
}

policy();
userAgents();
console.log("selftest-sessions: OK");
