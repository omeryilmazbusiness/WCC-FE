/**
 * Self-test: help & FAQ in settings — every guarded screen has a topic, the catalogue and
 * en/ar copy match one to one, messages are safe for ICU, search ranks and folds text,
 * and topics follow the viewer's screen permissions.
 * Run: npm run test:faq
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FAQ_TOPICS } from "../src/entities/faq/model/catalog.ts";
import { faqAnchor, normalizeFaqText, searchFaq, visibleFaqTopics, type FaqEntry } from "../src/entities/faq/model/search.ts";
import { DEMO_ROLE_PERMISSIONS, ROUTE_PERMISSIONS } from "../src/shared/config/permissions.ts";
import { findSettingsSection, isSettingsDetail, visibleSettings } from "../src/shared/config/settings.ts";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const en = JSON.parse(read("src/shared/i18n/messages/en.json"));
const ar = JSON.parse(read("src/shared/i18n/messages/ar.json"));

function catalogue() {
  const ids = FAQ_TOPICS.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, "topic ids are unique");
  for (const t of FAQ_TOPICS) {
    assert.ok(t.questions.length >= 3, `${t.id} answers at least 3 questions`);
    assert.equal(new Set(t.questions).size, t.questions.length, `${t.id} question ids are unique`);
  }
  const covered = new Set(FAQ_TOPICS.flatMap((t) => ("route" in t ? [t.route] : [])));
  for (const route of Object.keys(ROUTE_PERMISSIONS)) assert.ok(covered.has(route as never), `screen ${route} has a FAQ topic`);
  const total = FAQ_TOPICS.reduce((n, t) => n + t.questions.length, 0);
  assert.ok(total >= 120, `broad coverage (${total} questions)`);
}

function copy() {
  for (const [lang, msgs] of [["en", en], ["ar", ar]] as const) {
    const topics = msgs.faq.topics;
    assert.deepEqual(Object.keys(topics).sort(), FAQ_TOPICS.map((t) => t.id).sort(), `${lang}: topics match the catalogue`);
    for (const t of FAQ_TOPICS) {
      const topic = topics[t.id];
      assert.ok(topic.title && topic.summary, `${lang}: ${t.id} title and summary`);
      assert.deepEqual(Object.keys(topic.items).sort(), [...t.questions].sort(), `${lang}: ${t.id} questions match the catalogue`);
      for (const q of t.questions) {
        const item = topic.items[q];
        assert.ok(item.q?.length > 8 && item.a?.length > 30, `${lang}: ${t.id}.${q} has a question and a real answer`);
        for (const text of [item.q, item.a]) {
          assert.doesNotMatch(text, /[{}<>]/, `${lang}: ${t.id}.${q} has no ICU braces or tags`);
          assert.doesNotMatch(text, /'[{}#|]/, `${lang}: ${t.id}.${q} has no ICU quote escape`);
        }
      }
    }
    for (const key of ["searchPlaceholder", "results", "allTopics", "topicCount", "openScreen", "expandAll", "collapseAll", "copyLink", "emptyTitle", "emptyBody", "footer"]) {
      assert.ok(msgs.faq.ui[key], `${lang}: faq.ui.${key}`);
    }
    assert.ok(msgs.settings.sections.faq?.title && msgs.settings.groups.support, `${lang}: settings entry for help`);
  }
  assert.match(ar.faq.topics.bookings.items.confirm.q, /[\u0600-\u06FF]/, "Arabic copy is really Arabic");
}

function search() {
  const entries: FaqEntry[] = [
    { topic: "bookings", id: "confirm", question: "Why can't I confirm a booking?", answer: "The readiness checklist must be complete." },
    { topic: "bookings", id: "cancel", question: "How do cancellations work?", answer: "Cancel the booking; the penalty follows the policy." },
    { topic: "finance", id: "recon", question: "How do I reconcile BSP?", answer: "Import the billing period." },
  ];
  assert.equal(searchFaq(entries, "").length, 3, "empty query lists everything");
  assert.deepEqual(searchFaq(entries, "booking").map((e) => e.id), ["confirm", "cancel"], "question matches rank first");
  assert.deepEqual(searchFaq(entries, "BOOKING penalty").map((e) => e.id), ["cancel"], "every term must match");
  assert.equal(searchFaq(entries, "nothing-like-this").length, 0);
  assert.equal(normalizeFaqText("  Özet  Çağrı "), "ozet cagri", "Latin diacritics fold");
  assert.equal(normalizeFaqText("أهلاً"), normalizeFaqText("اهلا"), "Arabic hamza and tanween fold");
  assert.equal(faqAnchor("bookings", "confirm"), "faq-bookings-confirm");
}

function permissions() {
  const ids = (role: keyof typeof DEMO_ROLE_PERMISSIONS) => visibleFaqTopics(DEMO_ROLE_PERMISSIONS[role]).map((t) => t.id);
  assert.deepEqual(ids("gm").slice(0, 2), ["gettingStarted", "account"], "general topics come first");
  assert.ok(ids("gm").includes("setup") && ids("gm").includes("finance"), "the GM reads setup and finance help");
  assert.ok(!ids("gm").includes("companies"), "platform-only help stays hidden from companies");
  assert.ok(ids("admin").includes("companies"), "platform operators get the companies topic");
  for (const role of Object.keys(DEMO_ROLE_PERMISSIONS) as (keyof typeof DEMO_ROLE_PERMISSIONS)[]) {
    assert.ok(ids(role).includes("gettingStarted") && ids(role).includes("privacy"), `${role} always sees general topics`);
  }
  assert.ok(isSettingsDetail("faq"), "help opens inside settings");
  assert.equal(findSettingsSection("faq")!.permission, undefined, "help needs no extra permission");
  assert.ok(
    visibleSettings(DEMO_ROLE_PERMISSIONS.gm).some((g) => g.id === "support" && g.sections.some((s) => s.id === "faq")),
    "the GM sees Help in settings",
  );
}

function wiring() {
  assert.match(read("src/widgets/settings-sections/ui/settings-section-body.tsx"), /case "faq":/);
  const look = read("src/widgets/settings-sections/ui/faq/faq-look.ts");
  for (const t of FAQ_TOPICS) assert.match(look, new RegExp(`\\b${t.id}: \\{`), `icon for ${t.id}`);
}

catalogue();
copy();
search();
permissions();
wiring();
console.log(`faq self-test OK — ${FAQ_TOPICS.length} topics, ${FAQ_TOPICS.reduce((n, t) => n + t.questions.length, 0)} questions`);
