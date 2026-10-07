/**
 * Self-test: AI setup welcome screen — connection status, key checks before the provider call,
 * provider metadata, pause / resume API, layered wiring (entity → feature → widget → view)
 * and en/ar coverage of every visible string.
 * Run: npm run test:ai-setup
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { AI_PROVIDERS, type AISetup } from "../src/entities/ai/model.ts";
import {
  MIN_KEY_LENGTH,
  aiStatus,
  canKeepKey,
  detectProvider,
  initialProvider,
  isAIProvider,
  keyIssue,
  providerInfo,
} from "../src/entities/ai/setup.ts";
import { PROVIDER_LOOK } from "../src/features/ai-setup/model/provider-look.ts";
import { AI_FEATURES, AI_GUARDRAILS, STATUS_LOOK } from "../src/widgets/ai-setup-welcome/model/welcome-look.ts";

const root = (p: string) => new URL(`../${p}`, import.meta.url);
const read = (p: string) => readFileSync(root(p), "utf8");

const setup = (over: Partial<AISetup> = {}): AISetup => ({
  configured: false,
  enabled: false,
  provider: "",
  model: "",
  keyHint: "",
  setupCompleted: false,
  acceptedProviders: ["openai", "anthropic", "gemini"],
  ...over,
});

const OPENAI = "sk-proj-0123456789abcdefghij";
const CLAUDE = "sk-ant-api03-0123456789abcdef";
const GEMINI = "AIzaSyD-0123456789abcdefghij";

function status() {
  assert.equal(aiStatus(null), "off");
  assert.equal(aiStatus(setup()), "off");
  assert.equal(aiStatus(setup({ configured: true, enabled: false })), "paused", "a saved key that is switched off is paused");
  assert.equal(aiStatus(setup({ configured: true, enabled: true })), "ready");
  assert.equal(aiStatus(setup({ configured: false, enabled: true })), "off", "enabled without a key is not usable");
}

function keys() {
  assert.equal(detectProvider(OPENAI), "openai");
  assert.equal(detectProvider(CLAUDE), "anthropic", "sk-ant- wins over the generic sk- prefix");
  assert.equal(detectProvider(`  ${GEMINI} `), "gemini");
  assert.equal(detectProvider("custom-gateway-key-123456789"), null, "unknown formats are not second-guessed");

  const none = setup();
  assert.equal(keyIssue({ provider: "openai", key: "", stored: none }), "required");
  assert.equal(keyIssue({ provider: "openai", key: "sk-123", stored: none }), "malformed");
  assert.equal(keyIssue({ provider: "openai", key: "sk-proj-0123 456789abcdefghij", stored: none }), "malformed", "keys never contain spaces");
  assert.equal(keyIssue({ provider: "openai", key: "x".repeat(MIN_KEY_LENGTH), stored: none }), null, "gateway keys pass when long enough");
  assert.equal(keyIssue({ provider: "openai", key: CLAUDE, stored: none }), "mismatch");
  assert.equal(keyIssue({ provider: "anthropic", key: OPENAI, stored: none }), "mismatch");
  assert.equal(keyIssue({ provider: "gemini", key: GEMINI, stored: none }), null);
  assert.equal(keyIssue({ provider: "anthropic", key: ` ${CLAUDE} `, stored: none }), null, "pasted whitespace around a key is fine");

  const connected = setup({ configured: true, enabled: true, provider: "gemini", keyHint: "…abcd" });
  assert.equal(keyIssue({ provider: "gemini", key: "", stored: connected }), null, "blank keeps the stored key");
  assert.equal(keyIssue({ provider: "openai", key: "", stored: connected }), "required", "a new provider needs its own key");
  assert.ok(canKeepKey(connected, "gemini") && !canKeepKey(connected, "openai") && !canKeepKey(none, "gemini"), "keep only for the issuing provider");
}

function providers() {
  assert.equal(initialProvider(null), "openai");
  assert.equal(initialProvider(setup({ provider: "anthropic" })), "anthropic");
  assert.equal(initialProvider(setup({ acceptedProviders: ["gemini"] })), "gemini");
  assert.ok(isAIProvider("gemini") && !isAIProvider("mistral") && !isAIProvider(""));
  assert.equal(providerInfo("anthropic")?.name, "Claude");
  assert.equal(providerInfo(""), undefined);

  const ids = AI_PROVIDERS.map((p) => p.id);
  assert.deepEqual(ids, ["openai", "anthropic", "gemini"]);
  for (const p of AI_PROVIDERS) {
    assert.ok(p.models.length > 0 && new Set(p.models).size === p.models.length, `${p.id} has unique models`);
    assert.match(p.keyUrl, /^https:\/\//, `${p.id} key link is https`);
    assert.ok(p.name && p.label && p.hint, `${p.id} metadata`);
    assert.ok(PROVIDER_LOOK[p.id]?.icon && PROVIDER_LOOK[p.id]?.tone, `${p.id} has a look`);
  }
  assert.equal(Object.keys(PROVIDER_LOOK).length, AI_PROVIDERS.length);
}

function api() {
  const src = read("src/entities/ai/api.ts");
  assert.match(src, /disable\(\): Promise<AISetup>;/, "the repository exposes pause");
  assert.match(src, /"\/ai\/setup\/disable", \{ method: "POST" \}/, "pause hits the BE disable route");
  assert.match(src, /async disable\(\): Promise<AISetup> \{\s*return offline\(\);/, "offline twin never pretends to pause");
  const power = read("src/features/ai-setup/model/use-ai-power.ts");
  assert.match(power, /apiKey: ""/, "resume reuses the stored key (server re-verifies it)");
  const form = read("src/features/ai-setup/model/use-ai-setup-form.ts");
  assert.match(form, /if \(issue \|\| busy\) return false;/, "no provider call for a bad key or a double click");
  assert.match(form, /setApiKeyState\(""\)/, "the pasted key is cleared from memory after saving");
  assert.match(form, /const keyMode: KeyMode = canKeep \? mode : "replace";/, "keep is only offered when a key for this provider is stored");
  assert.match(form, /const sentKey = keyMode === "keep" \? "" : apiKey\.trim\(\);/, "keep sends a blank key so the server reuses the stored one");
  assert.match(form, /if \(next === "keep"\) setApiKeyState\(""\);/, "going back to keep discards the typed key");
  assert.match(read("src/entities/ai/api.ts"), /raw\.verification === "throttled"/, "throttled saves are surfaced");
  assert.match(read("src/features/ai-setup/ui/ai-provider-form.tsx"), /setup\.verification === "throttled"/, "a throttled save warns instead of claiming success");
  assert.match(form, /ai_model_not_found/);
  assert.match(form, /ai_key_invalid" \|\| code === "ai_rate_limited/);
}

function wiring() {
  assert.match(read("src/views/ai-setup-view.tsx"), /<AISetupWelcome \/>/, "the view only places the widget");
  for (const f of [
    "src/widgets/ai-setup-welcome/index.ts",
    "src/widgets/ai-setup-welcome/ui/welcome-hero.tsx",
    "src/widgets/ai-setup-welcome/ui/feature-grid.tsx",
    "src/widgets/ai-setup-welcome/ui/connection-card.tsx",
    "src/features/ai-setup/ui/provider-picker.tsx",
    "src/features/ai-setup/ui/api-key-field.tsx",
    "src/features/ai-setup/ui/model-picker.tsx",
    "src/features/ai-setup/ui/ai-power-button.tsx",
  ]) assert.ok(existsSync(root(f)), f);
  const widget = read("src/widgets/ai-setup-welcome/ui/ai-setup-welcome.tsx");
  assert.match(widget, /cacheKey: \["ai-setup"\]/, "revisits render instantly");
  assert.match(widget, /status === "off" \|\| editing/, "the form shows until connected, then only on demand");
  const featureUi = read("src/features/ai-setup/ui/ai-provider-form.tsx");
  assert.doesNotMatch(featureUi, /createAIRepository/, "the form gets its repository injected");
  const key = read("src/features/ai-setup/ui/api-key-field.tsx");
  assert.match(key, /type=\{visible \? "text" : "password"\}/);
  assert.match(key, /rel="noopener noreferrer"/);
  assert.match(key, /autoComplete="off"/);
  assert.match(read("src/features/ai-setup/ui/provider-picker.tsx"), /role="radiogroup"/);
  assert.equal(new Set(AI_FEATURES.map((f) => f.id)).size, AI_FEATURES.length);
  assert.deepEqual(Object.keys(STATUS_LOOK).sort(), ["off", "paused", "ready"]);
}

function messages() {
  const en = JSON.parse(read("src/shared/i18n/messages/en.json")).aiSetup;
  const ar = JSON.parse(read("src/shared/i18n/messages/ar.json")).aiSetup;
  const leaves = (o: unknown, p = ""): string[] =>
    o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => leaves(v, p ? `${p}.${k}` : k)) : [p];
  assert.deepEqual(leaves(ar).sort(), leaves(en).sort(), "aiSetup messages match in en and ar");
  for (const m of [en, ar]) {
    for (const f of AI_FEATURES) assert.ok(m.features[f.id]?.title && m.features[f.id]?.body, `features.${f.id}`);
    for (const g of AI_GUARDRAILS) assert.ok(m.guardrails[g.id]?.title && m.guardrails[g.id]?.body, `guardrails.${g.id}`);
    for (const s of ["off", "paused", "ready"]) assert.ok(m.status[s]?.label && m.status[s]?.body, `status.${s}`);
    for (const i of ["required", "malformed", "mismatch"]) assert.ok(m.keyIssues[i], `keyIssues.${i}`);
    for (const p of AI_PROVIDERS) assert.ok(m.providers[p.id], `providers.${p.id}`);
    for (const k of ["pause", "resume", "paused", "resumed", "failed"]) assert.ok(m.power[k], `power.${k}`);
    assert.match(m.keyIssues.mismatch, /\{provider\}/);
    assert.match(m.getKey, /\{provider\}/);
    assert.ok(m.keyMode.keep && m.keyMode.replace, "keyMode");
    assert.match(m.throttled.body, /\{provider\}/);
  }
}

status();
keys();
providers();
api();
wiring();
messages();
console.log("ai-setup selftest OK");
