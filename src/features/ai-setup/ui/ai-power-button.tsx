"use client";

import { Loader2, Pause, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AIRepository, AISetup } from "@/entities/ai";
import { Button, useMutationFeedback } from "@/shared/ui";
import { useAIPower } from "../model/use-ai-power";

type Props = {
  repo: Pick<AIRepository, "completeSetup" | "disable">;
  setup: AISetup;
  onChange: (setup: AISetup) => void;
};

/** Pause or resume AI for the branch; hidden until a provider is connected. */
export function AIPowerButton({ repo, setup, onChange }: Props) {
  const t = useTranslations("aiSetup.power");
  const feedback = useMutationFeedback();
  const power = useAIPower({
    repo,
    setup,
    onChange: (next) => {
      onChange(next);
      feedback.success(next.enabled ? t("resumed") : t("paused"));
    },
    onError: (err) => feedback.error(err, t("failed")),
  });

  if (power.status === "off") return null;
  const ready = power.status === "ready";
  const Icon = power.busy ? Loader2 : ready ? Pause : Play;

  return (
    <Button
      type="button"
      variant={ready ? "outline" : "default"}
      onClick={() => void (ready ? power.pause() : power.resume())}
      disabled={power.busy}
      className="h-10 rounded-full px-4"
      data-testid="ai-power"
      data-action={ready ? "pause" : "resume"}
    >
      <Icon className={power.busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden />
      {ready ? t("pause") : t("resume")}
    </Button>
  );
}
