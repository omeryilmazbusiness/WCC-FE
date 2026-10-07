/**
 * Self-test: AI assistant chat — reducer transitions, prompt limits and history, up to three
 * conversation tabs, safe rich text, the preview transport (streaming, abort, locale), en/ar
 * copy and suggestion intents, and that the panel, header icon and the bubble pinned on every
 * shell screen are wired behind `ai.read`.
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
  initialConversations,
  isConversationStreaming,
  type ConversationsState,
} from "../src/entities/assistant/model/conversations.ts";
import { parseRichText } from "../src/entities/assistant/model/rich-text.ts";
import { createPreviewTransport, previewIntent, previewReply } from "../src/entities/assistant/model/preview-transport.ts";
import type { AssistantChunk, AssistantRequest } from "../src/entities/assistant/model/types.ts";

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

reducer();
limits();
conversations();
richText();
await transport();
copy();
wiring();
console.log(`assistant self-test OK — ${Object.keys(en.assistant).length} copy groups, history ${HISTORY_TURNS} turns, prompt ≤ ${MAX_PROMPT_CHARS} chars`);
