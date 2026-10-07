/**
 * Self-test: AI assistant chat — reducer transitions, prompt limits and history, up to three
 * conversation tabs, safe rich text, the preview transport (streaming, abort, locale), en/ar
 * copy and suggestion intents, and that the panel, header icon and the bubble pinned on every
 * shell screen are wired behind `ai.read`. Live backend: reply metadata, the HTTP transport
 * (response mapping, error codes, abort), the protocol parser, Help & FAQ first (matching on
 * the real en/ar FAQ copy, the decorator and its bypass), protocol copy for every backend rule
 * and capability, and the Settings → AI protocol section.
 * Run: npm run test:assistant
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { HISTORY_TURNS, INITIAL_CHAT, MAX_PROMPT_CHARS, canSend, chatReducer, historyFor, isStreaming, type ChatState } from "../src/entities/assistant/model/chat-state.ts";
import {
  MAX_CONVERSATIONS,
  activeConversation,
  canOpenConversation,
  conversationTitle,
  conversationsReducer,
  hasConversationHistory,
  initialConversations,
  isConversationStreaming,
  type ConversationsState,
} from "../src/entities/assistant/model/conversations.ts";
import { parseRichText } from "../src/entities/assistant/model/rich-text.ts";
import { createPreviewTransport, previewIntent, previewReply } from "../src/entities/assistant/model/preview-transport.ts";
import { AssistantError, SHOWN_NOTICES, type AssistantChunk, type AssistantRequest, type AssistantTransport } from "../src/entities/assistant/model/types.ts";
import { revealDelay } from "../src/entities/assistant/model/stream.ts";
import { createHttpTransport, parseChatReply, parseProtocol, toAssistantError } from "../src/entities/assistant/api/assistant-api.ts";
import { ApiError } from "../src/shared/api/api-error.ts";
import type { HttpClient } from "../src/shared/api/http-client.ts";
import { FAQ_TOPICS } from "../src/entities/faq/model/catalog.ts";
import type { FaqEntry } from "../src/entities/faq/model/search.ts";
import { createFaqIndex, faqReply, isHelpQuestion, matchFaq, withFaqFirst } from "../src/features/ai-assistant/model/faq-first.ts";
import { SETTINGS_SECTIONS, visibleSettings } from "../src/shared/config/settings.ts";
import { DEMO_ROLE_PERMISSIONS } from "../src/shared/config/permissions.ts";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const en = JSON.parse(read("src/shared/i18n/messages/en.json"));
const ar = JSON.parse(read("src/shared/i18n/messages/ar.json"));

const send = (s: ChatState, n: number, text = `q${n}`) => chatReducer(s, { type: "send", userId: `u${n}`, replyId: `a${n}`, text, now: n });

function reducer() {
  let s = send(INITIAL_CHAT, 1, "  hello\r\nthere  ");
  assert.equal(s.messages.length, 2);
  assert.equal(s.messages[0].content, "hello\nthere", "prompt is trimmed and newlines normalised");
  assert.ok(isStreaming(s), "reply starts streaming");
  assert.equal(send(s, 2), s, "no second question while answering");

  s = chatReducer(s, { type: "delta", id: "a1", text: "Hi " });
  s = chatReducer(s, { type: "delta", id: "a1", text: "there" });
  s = chatReducer(s, { type: "finish", id: "a1" });
  assert.equal(s.messages[1].content, "Hi there");
  assert.equal(s.messages[1].status, "done");
  assert.equal(chatReducer(s, { type: "delta", id: "a1", text: "late" }).messages[1].content, "Hi there", "finished replies ignore late chunks");

  s = chatReducer(s, { type: "feedback", id: "a1", value: "up" });
  assert.equal(s.messages[1].feedback, "up");
  assert.equal(chatReducer(s, { type: "feedback", id: "u1", value: "up" }).messages[0].feedback, undefined, "only replies take feedback");

  s = send(s, 2);
  s = chatReducer(s, { type: "fail", id: "a2", code: "not_configured" });
  assert.equal(s.messages[3].status, "error");
  assert.equal(s.messages[3].errorCode, "not_configured");
  assert.equal(chatReducer(s, { type: "retry", id: "a1", now: 9 }), s, "only the last reply can be retried");
  s = chatReducer(s, { type: "retry", id: "a2", now: 9 });
  assert.equal(s.messages[3].status, "streaming");
  assert.equal(s.messages[3].errorCode, undefined);
  assert.equal(chatReducer(s, { type: "retry", id: "a2", now: 10 }), s, "no retry while streaming");

  s = chatReducer(s, { type: "delta", id: "a2", text: "partial" });
  s = chatReducer(s, { type: "stop", id: "a2" });
  assert.equal(s.messages[3].status, "stopped");
  assert.equal(s.messages[3].content, "partial", "stopping keeps what was written");
  assert.equal(chatReducer(s, { type: "finish", id: "a2" }).messages[3].status, "stopped", "a stopped reply stays stopped");

  const streaming = send(s, 3);
  assert.deepEqual(chatReducer(streaming, { type: "reset" }), INITIAL_CHAT, "new chat clears even mid-stream");
  assert.equal(chatReducer(INITIAL_CHAT, { type: "delta", id: "gone", text: "x" }).messages.length, 0, "chunks for a cleared reply are ignored");
}

function limits() {
  assert.ok(!canSend(INITIAL_CHAT, "   \n "), "blank prompts are rejected");
  assert.ok(canSend(INITIAL_CHAT, "x".repeat(MAX_PROMPT_CHARS)));
  assert.ok(!canSend(INITIAL_CHAT, "x".repeat(MAX_PROMPT_CHARS + 1)), "over-long prompts are rejected");
  assert.ok(canSend(INITIAL_CHAT, `  ${"x".repeat(MAX_PROMPT_CHARS)}  `), "surrounding spaces do not count");

  let s = INITIAL_CHAT;
  for (let i = 0; i < 15; i++) {
    s = send(s, i);
    s = chatReducer(s, { type: "delta", id: `a${i}`, text: `r${i}` });
    s = chatReducer(s, { type: "finish", id: `a${i}` });
  }
  const history = historyFor(s.messages);
  assert.equal(history.length, HISTORY_TURNS, "history is capped");
  assert.deepEqual(history.at(-1), { role: "assistant", content: "r14" }, "newest turn is last");

  s = send(s, 99);
  s = chatReducer(s, { type: "fail", id: "a99", code: "unavailable" });
  assert.ok(!historyFor(s.messages).some((m) => m.content === ""), "failed and empty replies are not sent back");
  const pending = send(INITIAL_CHAT, 1);
  assert.deepEqual(historyFor(pending.messages), [{ role: "user", content: "q1" }], "a streaming reply is not history");
}

function conversations() {
  const ask = (s: ConversationsState, id: string, n: number, text = `q${n}`) =>
    conversationsReducer(s, { type: "chat", id, action: { type: "send", userId: `u${n}`, replyId: `a${n}`, text, now: n } });
  const finish = (s: ConversationsState, id: string, n: number) =>
    conversationsReducer(conversationsReducer(s, { type: "chat", id, action: { type: "delta", id: `a${n}`, text: `r${n}` } }), { type: "chat", id, action: { type: "finish", id: `a${n}` } });

  let s = initialConversations("c1", 0);
  assert.equal(s.conversations.length, 1);
  assert.equal(conversationTitle(activeConversation(s)), null, "an empty chat has no title yet");
  assert.equal(conversationsReducer(s, { type: "open", id: "x", now: 1 }), s, "an unused tab is reused, not duplicated");

  s = ask(s, "c1", 1, "  Revenue\n by   branch ");
  assert.equal(conversationTitle(activeConversation(s)), "Revenue by branch", "title is the first question on one line");
  s = conversationsReducer(s, { type: "open", id: "c2", now: 2 });
  assert.equal(s.activeId, "c2", "a new tab becomes active");
  assert.ok(isConversationStreaming(s.conversations[0]), "the first tab keeps streaming in the background");
  s = ask(s, "c2", 2);
  assert.ok(isConversationStreaming(activeConversation(s)), "each tab streams on its own");
  s = finish(s, "c1", 1);
  assert.equal(s.conversations[0].chat.messages[1].content, "r1", "background reply lands in its own tab");
  assert.equal(activeConversation(s).chat.messages[1].content, "", "and does not leak into the active tab");

  s = conversationsReducer(s, { type: "open", id: "c3", now: 3 });
  s = ask(s, "c3", 3);
  assert.equal(s.conversations.length, MAX_CONVERSATIONS);
  assert.ok(!canOpenConversation(s), `no more than ${MAX_CONVERSATIONS} chats`);
  assert.equal(conversationsReducer(s, { type: "open", id: "c4", now: 4 }), s, "opening past the limit is ignored");

  const unchanged = conversationsReducer(s, { type: "chat", id: "c1", action: { type: "delta", id: "missing", text: "x" } });
  assert.equal(unchanged, s, "no-op chat actions keep the same state");
  assert.equal(conversationsReducer(s, { type: "select", id: "nope" }), s, "unknown tabs cannot be selected");

  s = conversationsReducer(s, { type: "select", id: "c2" });
  s = conversationsReducer(s, { type: "close", id: "c2", freshId: "f", now: 5 });
  assert.deepEqual(s.conversations.map((c) => c.id), ["c1", "c3"]);
  assert.equal(s.activeId, "c1", "closing the active tab moves to its neighbour");
  assert.ok(canOpenConversation(s), "closing frees a slot");
  s = conversationsReducer(s, { type: "close", id: "c3", freshId: "f", now: 6 });
  assert.equal(s.activeId, "c1", "closing a background tab keeps the current one");
  s = conversationsReducer(s, { type: "close", id: "c1", freshId: "fresh", now: 7 });
  assert.deepEqual(s, initialConversations("fresh", 7), "closing the last tab leaves one fresh chat");
  assert.equal(conversationsReducer(s, { type: "close", id: "ghost", freshId: "g", now: 8 }), s);
  assert.equal(conversationsReducer(s, { type: "chat", id: "c1", action: { type: "stop", id: "a1" } }), s, "late chunks of a closed tab are ignored");

  // Clear all
  assert.ok(!hasConversationHistory(s), "a single empty chat has nothing to clear");
  assert.equal(conversationsReducer(s, { type: "clear", freshId: "z", now: 9 }), s, "clearing nothing changes nothing");
  let busy = conversationsReducer(s, { type: "chat", id: "fresh", action: { type: "send", userId: "u", replyId: "r", text: "Hi", now: 10 } });
  busy = conversationsReducer(busy, { type: "open", id: "second", now: 11 });
  assert.ok(hasConversationHistory(busy));
  const cleared = conversationsReducer(busy, { type: "clear", freshId: "new", now: 12 });
  assert.deepEqual(cleared, initialConversations("new", 12), "clear all leaves one fresh, empty chat");
  assert.equal(conversationsReducer(cleared, { type: "chat", id: "fresh", action: { type: "delta", id: "r", text: "late" } }), cleared, "late chunks after clearing are ignored");
}

function richText() {
  const blocks = parseRichText("### Title\nPlain **bold** and `code`\n\n- one\n- **two**\n\n1. first\n2. second\nTail <script>alert(1)</script>");
  assert.deepEqual(
    blocks.map((b) => b.kind),
    ["heading", "paragraph", "list", "list", "paragraph"],
  );
  const para = blocks[1];
  assert.ok(para.kind === "paragraph");
  assert.deepEqual(para.inlines.map((i) => i.kind), ["text", "bold", "text", "code"]);
  const [bullets, numbers] = [blocks[2], blocks[3]];
  assert.ok(bullets.kind === "list" && !bullets.ordered && bullets.items.length === 2);
  assert.ok(numbers.kind === "list" && numbers.ordered && numbers.items.length === 2);
  const tail = blocks[4];
  assert.ok(tail.kind === "paragraph" && tail.inlines.every((i) => i.kind === "text"), "markup stays plain text");
  assert.ok(tail.kind === "paragraph" && tail.inlines.map((i) => i.text).join("").includes("<script>"), "tags are text, never HTML");
  assert.deepEqual(parseRichText(""), []);
  assert.ok(parseRichText("**unclosed bold").every((b) => b.kind === "paragraph"), "half-streamed markup still renders");
}

async function transport() {
  const req = (content: string, locale: "en" | "ar" = "en"): AssistantRequest => ({ messages: [{ role: "user", content }], context: { locale } });
  const fast = createPreviewTransport({ firstTokenMs: 0, tokenMs: 0 });
  assert.equal(fast.mode, "preview");

  const chunks: AssistantChunk[] = [];
  for await (const c of fast.stream(req("Give me today's summary"), new AbortController().signal)) chunks.push(c);
  assert.deepEqual(chunks.at(-1), { type: "done" }, "stream ends with done");
  const text = chunks.flatMap((c) => (c.type === "delta" ? [c.text] : [])).join("");
  assert.equal(text, previewReply(req("Give me today's summary")), "deltas rebuild the full reply");
  assert.ok(chunks.length > 10, "reply arrives in pieces");

  assert.notEqual(previewReply(req("ملخص اليوم", "ar")), previewReply(req("today summary")), "replies follow the locale");
  assert.match(previewReply(req("ملخص اليوم", "ar")), /[\u0600-\u06FF]/);

  const controller = new AbortController();
  const slow = createPreviewTransport({ firstTokenMs: 5, tokenMs: 5 });
  const got: AssistantChunk[] = [];
  let aborted = false;
  try {
    for await (const c of slow.stream(req("revenue"), controller.signal)) {
      got.push(c);
      if (got.length === 3) controller.abort();
    }
  } catch {
    aborted = true;
  }
  assert.ok(aborted, "aborting rejects the stream");
  assert.equal(got.length, 3, "no chunks after abort");
  assert.ok(!got.some((c) => c.type === "done"));

  const pre = new AbortController();
  pre.abort();
  await assert.rejects(async () => {
    for await (const _ of slow.stream(req("x"), pre.signal)) void _;
  }, "an already aborted request never starts");
}

function copy() {
  const keys = (o: object, p = ""): string[] =>
    Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
  assert.deepEqual(keys(ar.assistant).sort(), keys(en.assistant).sort(), "en/ar assistant keys match");
  for (const [lang, m] of [["en", en.assistant], ["ar", ar.assistant]] as const) {
    for (const g of ["morning", "afternoon", "evening", "default"]) assert.match(m.greeting[g], /\{name\}/, `${lang}: greeting.${g} names the viewer`);
    assert.match(m.tooLong, /\{max, number\}/, `${lang}: tooLong shows the limit`);
    for (const id of ["summary", "leads", "revenue", "followUp"] as const) {
      assert.equal(previewIntent(m.suggestions[id].prompt), id, `${lang}: suggestion "${id}" gets its matching preview answer`);
    }
    for (const k of ["unavailable", "notConfigured"]) assert.ok(m.errors[k], `${lang}: errors.${k}`);
    assert.match(m.tabs.close, /\{title\}/, `${lang}: closing a tab names it`);
  }
  assert.equal(previewIntent("hello there"), "fallback");
}

function wiring() {
  const shell = read("src/widgets/app-shell/ui/app-shell.tsx");
  assert.match(shell, /useCan\("ai\.read"\)/, "the shell gates the assistant by ai.read");
  assert.match(shell, /<AssistantProvider enabled=\{canAssist\}>/);
  assert.equal(shell.match(/<AssistantPanel\b/g)?.length, 1, "exactly one panel per shell");
  assert.match(read("src/widgets/app-shell/ui/app-header.tsx"), /<AssistantHeaderButton \/>/, "header has the assistant icon");
  assert.equal(shell.match(/<AssistantBubble \/>/g)?.length, 1, "the bubble is pinned once, on every shell screen");
  assert.match(shell, /canAssist && "pb-24/, "pages leave room for the bubble");
  assert.doesNotMatch(read("src/widgets/manager-dashboard/ui/manager-dashboard-board.tsx"), /AssistantBubble/, "no page renders its own bubble");
  const bubble = read("src/features/ai-assistant/ui/assistant-bubble.tsx");
  assert.match(bubble, /fixed bottom-4 end-4/, "bubble is fixed to the bottom corner");

  const panel = read("src/features/ai-assistant/ui/assistant-panel.tsx");
  assert.match(panel, /role="dialog"/);
  assert.match(panel, /inert=\{!open\}/, "a closed panel cannot take focus");
  assert.match(panel, /rtl:-translate-x/, "panel slides out on the correct side in Arabic");
  assert.match(panel, /role="tabpanel"/, "the thread is the panel of the active tab");
  const tabs = read("src/features/ai-assistant/ui/conversation-tabs.tsx");
  assert.match(tabs, /role="tablist"/);
  assert.match(tabs, /aria-selected=\{selected\}/);
  assert.match(tabs, /ArrowRight: rtl \? -1 : 1/, "arrow keys follow reading direction");
  assert.match(tabs, /\{canOpen \? \(/, "the new-chat button disappears at the limit");
  assert.match(tabs, /\[@media\(hover:none\)\]:opacity-100/, "touch screens can still close the active tab");
  assert.match(panel, /<header[\s\S]*<ConversationTabs[\s\S]*<\/header>/, "tabs live inside the panel header");
  assert.doesNotMatch(read("src/features/ai-assistant/ui/rich-text.tsx"), /dangerouslySetInnerHTML/, "replies are never injected as HTML");
  assert.match(read("src/app/globals.css"), /prefers-reduced-motion[\s\S]*animate-assistant-orb/, "animations respect reduced motion");
}

/** Mirrors `internal/domain/assistant/protocol.go` in the backend. */
const BE_RULES = ["read_only", "no_send", "own_scope", "no_invented_numbers", "minimal_data", "faq_first", "fixed_capabilities", "never_blocked", "audited", "user_language"];
const BE_CAPABILITIES = ["ops_summary", "lead_focus", "revenue_status", "message_draft", "app_help"];

const collect = async (stream: AsyncIterable<AssistantChunk>) => {
  const out: AssistantChunk[] = [];
  for await (const c of stream) out.push(c);
  return out;
};
const textOf = (chunks: AssistantChunk[]) => chunks.flatMap((c) => (c.type === "delta" ? [c.text] : [])).join("");
const metaOf = (chunks: AssistantChunk[]) => chunks.find((c) => c.type === "meta")?.meta;

function tokenBudget() {
  assert.ok(HISTORY_TURNS <= 8, "never more context than the backend can use");
  let s = send(INITIAL_CHAT, 1, "How do I change my password?");
  s = chatReducer(s, { type: "meta", id: "a1", meta: { source: "faq" } });
  s = chatReducer(s, { type: "delta", id: "a1", text: "FAQ text" });
  s = chatReducer(s, { type: "finish", id: "a1" });
  s = send(s, 2, "weather?");
  s = chatReducer(s, { type: "meta", id: "a2", meta: { source: "rule" } });
  s = chatReducer(s, { type: "delta", id: "a2", text: "I can only help with WODI work" });
  s = chatReducer(s, { type: "finish", id: "a2" });
  s = send(s, 3, "summary");
  s = chatReducer(s, { type: "meta", id: "a3", meta: { source: "data" } });
  s = chatReducer(s, { type: "delta", id: "a3", text: "Open leads: 4" });
  s = chatReducer(s, { type: "finish", id: "a3" });
  const h = historyFor(s.messages);
  assert.deepEqual(h.map((m) => m.content), ["How do I change my password?", "weather?", "summary", "Open leads: 4"], "canned FAQ / rule replies are not sent back as context");

  assert.equal(revealDelay(10, 12), 12, "short replies type at the normal pace");
  assert.equal(revealDelay(900, 12), 1, "long replies finish within the reveal budget");
  assert.equal(revealDelay(0, 12), 0);
}

function silentFallbacks() {
  assert.deepEqual([...SHOWN_NOTICES], ["not_allowed"], "only actionable notices are shown; fallbacks just show the source");
  const meta = read("src/features/ai-assistant/ui/reply-meta.tsx");
  assert.match(meta, /SHOWN_NOTICES\.has\(meta\.notice\)/);
  const panel = read("src/features/ai-assistant/ui/assistant-panel.tsx");
  assert.match(panel, /<ClearChatsButton\s+disabled=\{!chats\.canClear\}/, "the header has a clear-all button");
  const hook = read("src/features/ai-assistant/model/use-assistant-conversations.ts");
  assert.match(hook, /controllers\.current\.forEach\(\(c\) => c\.abort\(\)\);\s*controllers\.current\.clear\(\);/, "clearing stops every stream first");
  const button = read("src/features/ai-assistant/ui/clear-chats-button.tsx");
  assert.match(button, /if \(!confirming\) return setConfirming\(true\);/, "a single tap never deletes");
}

function metaReducer() {
  let s = send(INITIAL_CHAT, 1);
  s = chatReducer(s, { type: "meta", id: "a1", meta: { source: "data", notice: "not_configured" } });
  assert.equal(s.messages[1].meta?.source, "data", "metadata lands on the streaming reply");
  s = chatReducer(s, { type: "delta", id: "a1", text: "x" });
  s = chatReducer(s, { type: "finish", id: "a1" });
  assert.equal(chatReducer(s, { type: "meta", id: "a1", meta: { source: "ai" } }), s, "a finished reply keeps its metadata");
  s = chatReducer(s, { type: "retry", id: "a1", now: 9 });
  assert.equal(s.messages[1].meta, undefined, "regenerating clears the old source");
}

function fakeClient(respond: (path: string, init?: RequestInit) => unknown): HttpClient & { calls: { path: string; body: unknown }[] } {
  const calls: { path: string; body: unknown }[] = [];
  return {
    calls,
    async request<T>(path: string, init?: RequestInit) {
      calls.push({ path, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      return respond(path, init) as T;
    },
    async raw() {
      throw new Error("unused");
    },
  };
}

async function httpTransport() {
  const parsed = parseChatReply({ reply: "Hi", source: "data", capability: "ops_summary", notice: "quota_reached", quota: { limit: 40, used: 40, remaining: 0, mode: "essential", resets_at: "2026-10-08T00:00:00+03:00" } });
  assert.deepEqual(parsed.meta, { source: "data", capability: "ops_summary", notice: "quota_reached", quota: { limit: 40, used: 40, remaining: 0, mode: "essential", resetsAt: "2026-10-08T00:00:00+03:00" } });
  assert.equal(parseChatReply({ reply: "x", source: "weird", notice: "nope" }).meta.source, "ai", "unknown sources fall back to ai");
  assert.equal(parseChatReply({ reply: "x", notice: "nope" }).meta.notice, undefined, "unknown notices are dropped");
  assert.equal(parseChatReply(null).reply, "");

  const err = (status: number) => toAssistantError(new ApiError({ status, code: "x", message: "x" }));
  assert.equal(err(403).code, "forbidden");
  assert.equal(err(429).code, "rate_limited");
  assert.equal(err(400).code, "invalid");
  assert.equal(err(500).code, "unavailable");
  assert.equal(err(0).code, "offline", "no HTTP response means offline");
  assert.equal(toAssistantError(new AssistantError("not_configured")).code, "not_configured");

  const reply = "**Today**\n- 3 open leads\n- 1 overdue task";
  const client = fakeClient(() => ({ reply, source: "data", capability: "ops_summary", quota: { limit: 40, used: 2, remaining: 38, mode: "full" } }));
  const live = createHttpTransport(client, { revealMs: 0 });
  assert.equal(live.mode, "live");
  const req: AssistantRequest = { messages: [{ role: "user", content: "summary" }], context: { locale: "ar", screen: "manager", branchId: "b1" }, options: { skipFaq: true } };
  const chunks = await collect(live.stream(req, new AbortController().signal));
  assert.equal(chunks[0].type, "meta", "metadata arrives before the text");
  assert.equal(textOf(chunks), reply, "pieces rebuild the reply exactly");
  assert.deepEqual(chunks.at(-1), { type: "done" });
  assert.equal(client.calls[0].path, "/ai/assistant/chat");
  assert.deepEqual(client.calls[0].body, { messages: req.messages, context: { locale: "ar", screen: "manager" } }, "only messages, locale and screen are sent");

  const failing = createHttpTransport(fakeClient(() => { throw new ApiError({ status: 429, code: "rate_limited", message: "slow down" }); }), { revealMs: 0 });
  await assert.rejects(collect(failing.stream(req, new AbortController().signal)), (e) => e instanceof AssistantError && e.code === "rate_limited");
  const empty = createHttpTransport(fakeClient(() => ({ reply: "  " })), { revealMs: 0 });
  await assert.rejects(collect(empty.stream(req, new AbortController().signal)), (e) => e instanceof AssistantError && e.code === "unavailable", "an empty reply is an error, not a blank bubble");

  const controller = new AbortController();
  const slow = createHttpTransport(fakeClient(() => ({ reply: "one two three four five six", source: "ai" })), { revealMs: 5 });
  const got: AssistantChunk[] = [];
  await assert.rejects(async () => {
    for await (const c of slow.stream(req, controller.signal)) {
      got.push(c);
      if (got.length === 3) controller.abort();
    }
  });
  assert.equal(got.length, 3, "nothing is revealed after Stop");

  const protocol = parseProtocol({
    version: "2026-10.1",
    rules: BE_RULES,
    capabilities: [{ id: "ops_summary", kind: "data", requires: ["ai.read", "dashboard.read"], allowed: true, uses_model: true, uses_data: true, max_output_tokens: 300 }, { id: "x", kind: "bogus" }],
    ai_configured: false,
    faq_first: true,
    quota: { limit: 0, used: 3, remaining: -1, mode: "full", resets_at: "" },
    limits: { max_prompt_chars: 4000, history_turns: 4, history_chars: 1200, cache_minutes: 10 },
  });
  assert.equal(protocol.capabilities[0].usesData && protocol.capabilities[0].usesModel, true);
  assert.deepEqual(protocol.capabilities[0].requires, ["ai.read", "dashboard.read"]);
  assert.equal(protocol.capabilities[1].kind, "rule", "unknown kinds are treated as rules");
  assert.equal(protocol.quota.remaining, -1, "0 limit means unlimited");
  assert.equal(protocol.limits.historyTurns, 4);
  assert.equal(parseProtocol({}).faqFirst, true, "FAQ first is the default");
}

function faqEntries(lang: typeof en): FaqEntry[] {
  return FAQ_TOPICS.flatMap((topic) =>
    topic.questions.map((q) => ({ topic: topic.id, id: q, question: lang.faq.topics[topic.id].items[q].q, answer: lang.faq.topics[topic.id].items[q].a })),
  );
}

async function faqFirst() {
  const entries = faqEntries(en);
  const arEntries = faqEntries(ar);
  const hit = (q: string, list = entries) => matchFaq(q, list);

  // Context-only questions ("How do I use it?") carry no topic words and rightly go to the assistant.
  for (const [lang, list] of [["en", entries], ["ar", arEntries]] as const) {
    const misses = list.filter((e) => hit(e.question, list)?.question !== e.question);
    const wrong = misses.filter((e) => hit(e.question, list));
    console.log(`  ${lang}: ${list.length - misses.length}/${list.length} FAQ questions answer themselves${misses.length ? ` (miss: ${misses.map((e) => `${e.topic}.${e.id}`).join(", ")})` : ""}`);
    assert.ok((list.length - misses.length) / list.length >= 0.9, `${lang}: FAQ questions find themselves`);
    assert.ok(wrong.length <= Math.ceil(list.length * 0.03), `${lang}: almost never the wrong entry (${wrong.map((e) => `${e.topic}.${e.id}`).join(", ")})`);
  }

  assert.equal(hit("how do i change my password")?.id, "password", "lower case, no question mark");
  assert.equal(hit("How can I add a new lead?")?.id, "create", "paraphrase finds the entry");
  assert.equal(hit("where do I switch branches?")?.id, "branch", "plural / stem tolerant");

  for (const q of ["Give me today's summary", "How many leads do I have?", "Draft a follow-up for the Smith family", "How is revenue tracking against our target?", "ملخص اليوم", "hello"]) {
    assert.equal(hit(q), null, `"${q}" goes to the assistant, not the FAQ`);
  }
  for (const q of ["How do I bake a cake?", "What is the capital of France?"]) assert.equal(hit(q), null, `"${q}" has no FAQ match`);
  assert.ok(isHelpQuestion("Where do I see unpaid bookings?"));
  assert.ok(!isHelpQuestion("summary of my week"));

  let innerCalls = 0;
  const inner: AssistantTransport = {
    mode: "live",
    async *stream() {
      innerCalls++;
      yield { type: "meta", meta: { source: "ai" } };
      yield { type: "delta", text: "from ai" };
      yield { type: "done" };
    },
  };
  const t = withFaqFirst(inner, (q) => matchFaq(q, entries));
  assert.equal(t.mode, "live", "the decorator keeps the inner mode");
  const ask = (content: string, skipFaq?: boolean): AssistantRequest => ({ messages: [{ role: "user", content }], context: { locale: "en" }, options: { skipFaq } });

  const fromFaq = await collect(t.stream(ask("How do I change my password?"), new AbortController().signal));
  const pw = entries.find((e) => e.id === "password")!;
  assert.equal(innerCalls, 0, "a FAQ hit never reaches the backend");
  assert.deepEqual(metaOf(fromFaq), { source: "faq", capability: "app_help", faq: { topic: "account", id: "password" } });
  assert.equal(textOf(fromFaq), faqReply(pw), "the FAQ answer is shown with its question");

  await collect(t.stream(ask("How do I change my password?", true), new AbortController().signal));
  assert.equal(innerCalls, 1, "\"Ask AI instead\" bypasses the FAQ");
  const miss = await collect(t.stream(ask("Give me today's summary"), new AbortController().signal));
  assert.equal(innerCalls, 2);
  assert.equal(metaOf(miss)?.source, "ai", "no match falls through to the assistant");

  const index = createFaqIndex(entries);
  const started = performance.now();
  for (let i = 0; i < 500; i++) index(i % 2 ? "How do I change my password?" : "where do I switch branches?");
  const perLookup = (performance.now() - started) / 500;
  console.log(`  FAQ lookup: ${perLookup.toFixed(3)} ms per question over ${entries.length} entries`);
  assert.ok(perLookup < 2, "a FAQ lookup stays well under a frame");

  const aborted = new AbortController();
  aborted.abort();
  await assert.rejects(collect(t.stream(ask("How do I change my password?"), aborted.signal)), "Stop also cancels a FAQ answer");
}

function protocolCopy() {
  for (const [lang, m] of [["en", en], ["ar", ar]] as const) {
    const p = m.settings.aiProtocol;
    for (const id of BE_RULES) assert.ok(p.rules.items[id]?.title && p.rules.items[id]?.body, `${lang}: rule ${id}`);
    for (const id of BE_CAPABILITIES) assert.ok(p.capabilities.items[id]?.title && p.capabilities.items[id]?.body, `${lang}: capability ${id}`);
    for (const step of ["faq", "rules", "data", "cache", "ai"]) assert.ok(p.pipeline.steps[step]?.title, `${lang}: pipeline ${step}`);
    for (const n of SHOWN_NOTICES) assert.ok(m.assistant.meta.notices[n], `${lang}: notice ${n}`);
    for (const n of ["quota_reached", "not_configured", "ai_unavailable"]) assert.equal(m.assistant.meta.notices[n], undefined, `${lang}: fallback notice ${n} stays silent`);
    for (const k of ["label", "confirm", "confirmShort"]) assert.ok(m.assistant.clear?.[k], `${lang}: clear.${k}`);
    for (const s of ["faq", "data", "cache", "ai", "rule", "preview"]) assert.ok(m.assistant.meta.sources[s], `${lang}: source ${s}`);
    for (const k of ["forbidden", "rateLimited", "invalid", "offline"]) assert.ok(m.assistant.errors[k], `${lang}: errors.${k}`);
    assert.match(p.quota.used, /\{used\}[\s\S]*\{limit\}/, `${lang}: quota shows used and limit`);
    assert.match(p.limits.body, /\{chars\}[\s\S]*\{turns\}[\s\S]*\{minutes\}/, `${lang}: limits interpolate every value`);
  }
}

function settingsWiring() {
  const ai = SETTINGS_SECTIONS.find((s) => s.id === "ai");
  assert.ok(ai && ai.group === "support" && ai.permission === "ai.read" && !ai.href, "AI protocol is a support detail behind ai.read");
  const ids = (role: keyof typeof DEMO_ROLE_PERMISSIONS) => visibleSettings(DEMO_ROLE_PERMISSIONS[role]).flatMap((g) => g.sections.map((s) => s.id));
  assert.ok(ids("employee").includes("ai"), "every AI user can read the protocol");
  assert.ok(ids("gm").includes("ai"));
  assert.match(read("src/widgets/settings-sections/ui/settings-section-body.tsx"), /case "ai":\s*return <AiProtocolSection \/>/);
  assert.match(read("src/widgets/settings-hub/ui/section-look.ts"), /ai: \{ icon: Sparkles/);
  const section = read("src/widgets/settings-sections/ui/ai-protocol/ai-protocol-section.tsx");
  assert.match(section, /fetchAssistantProtocol\(\)/, "the page reads the live protocol from the backend");
  assert.match(section, /data-allowed=\{c\.allowed\}/, "each capability shows whether this viewer may use it");
  const shell = read("src/features/ai-assistant/model/use-assistant-transport.ts");
  assert.match(shell, /withFaqFirst\(demo \? createPreviewTransport\(\) : createLiveTransport\(\), lookup\)/, "FAQ first wraps the live and preview transports");
  assert.match(shell, /useMemo\(\(\) => createFaqIndex\(/, "the FAQ index is built once per catalogue, not per question");
  assert.match(read("src/widgets/app-shell/ui/app-shell.tsx"), /useAssistantTransport\(\)/, "the shell uses the live transport");
  const hook = read("src/features/ai-assistant/model/use-assistant-conversations.ts");
  assert.match(hook, /\{ skipFaq: true \}/, "Regenerate asks the assistant, not the FAQ");
  assert.match(read("src/features/ai-assistant/ui/message-item.tsx"), /meta\.source === "faq" && isLast/, "\"Ask AI instead\" is offered on the latest FAQ answer");
}

reducer();
silentFallbacks();
tokenBudget();
metaReducer();
await httpTransport();
await faqFirst();
protocolCopy();
settingsWiring();
limits();
conversations();
richText();
await transport();
copy();
wiring();
console.log(`assistant self-test OK — ${Object.keys(en.assistant).length} copy groups, history ${HISTORY_TURNS} turns, prompt ≤ ${MAX_PROMPT_CHARS} chars`);
