import type { SetupOverview } from "@/entities/setup";
import { SetupScreen } from "@/features/gm-setup";

export function SetupView({ initial, showIntro }: { initial: SetupOverview | null; showIntro: boolean }) {
  return <SetupScreen initial={initial} showIntro={showIntro} />;
}
