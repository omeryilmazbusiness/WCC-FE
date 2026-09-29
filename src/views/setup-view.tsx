import type { SetupOverview } from "@/entities/setup";
import { SetupScreen } from "@/features/gm-setup";

export function SetupView({ initial }: { initial: SetupOverview | null }) {
  return <SetupScreen initial={initial} />;
}
