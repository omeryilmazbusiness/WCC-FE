import { AI_PROVIDERS, type AIProvider, type AIProviderInfo, type AISetup } from "./model";

/** Branch AI state as people see it: never connected, connected but paused, or answering. */
export type AIStatus = "off" | "paused" | "ready";

export function aiStatus(setup: AISetup | null | undefined): AIStatus {
  if (!setup?.configured) return "off";
  return setup.enabled ? "ready" : "paused";
}

export function providerInfo(id: AIProvider | "" | null | undefined): AIProviderInfo | undefined {
  return AI_PROVIDERS.find((p) => p.id === id);
}

export function isAIProvider(v: unknown): v is AIProvider {
  return typeof v === "string" && AI_PROVIDERS.some((p) => p.id === v);
}

/** Provider whose key format this looks like; `sk-ant-` must win over the generic `sk-`. */
export function detectProvider(key: string): AIProvider | null {
  const k = key.trim();
  if (k.startsWith("sk-ant-")) return "anthropic";
  if (k.startsWith("AIza")) return "gemini";
  if (k.startsWith("sk-")) return "openai";
  return null;
}

/** Shortest real key any provider issues; anything shorter is a paste mistake. */
export const MIN_KEY_LENGTH = 20;

export type KeyIssue = "required" | "malformed" | "mismatch";

/** A stored key can be kept only for the provider that issued it; the server enforces the same. */
export function canKeepKey(setup: AISetup | null | undefined, provider: AIProvider): boolean {
  return Boolean(setup?.configured) && setup?.provider === provider;
}

/**
 * Checks before the server verifies with the provider. A blank key is fine when one is
 * already stored for the same provider (the server keeps it).
 */
export function keyIssue(input: { provider: AIProvider; key: string; stored: AISetup | null | undefined }): KeyIssue | null {
  const key = input.key.trim();
  if (!key) {
    return canKeepKey(input.stored, input.provider) ? null : "required";
  }
  if (/\s/.test(key) || key.length < MIN_KEY_LENGTH) return "malformed";
  const looksLike = detectProvider(key);
  if (looksLike && looksLike !== input.provider) return "mismatch";
  return null;
}

/** Provider the form opens with: the connected one, else the first accepted, else OpenAI. */
export function initialProvider(setup: AISetup | null | undefined): AIProvider {
  if (isAIProvider(setup?.provider)) return setup.provider;
  const accepted = setup?.acceptedProviders?.find(isAIProvider);
  return accepted ?? "openai";
}
