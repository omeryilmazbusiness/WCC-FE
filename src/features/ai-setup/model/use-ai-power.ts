"use client";

import { useState } from "react";
import { aiStatus, isAIProvider, type AIRepository, type AISetup } from "@/entities/ai";

type Options = {
  repo: Pick<AIRepository, "completeSetup" | "disable">;
  setup: AISetup;
  onChange: (setup: AISetup) => void;
  onError: (err: unknown) => void;
};

/** Pause keeps the stored key; resume re-verifies it with the provider before turning AI back on. */
export function useAIPower({ repo, setup, onChange, onError }: Options) {
  const [busy, setBusy] = useState(false);
  const status = aiStatus(setup);

  async function run(action: () => Promise<AISetup>): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    try {
      onChange(await action());
      return true;
    } catch (err) {
      onError(err);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return {
    status,
    busy,
    pause: () => run(() => repo.disable()),
    resume: () =>
      run(() => {
        if (!isAIProvider(setup.provider)) throw new Error("no provider to resume");
        return repo.completeSetup({ provider: setup.provider, apiKey: "", model: setup.model || undefined });
      }),
  };
}
