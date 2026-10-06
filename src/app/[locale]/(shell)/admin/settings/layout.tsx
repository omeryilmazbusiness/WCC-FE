import type { ReactNode } from "react";
import { SettingsShellView } from "@/views/settings-view";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <SettingsShellView>{children}</SettingsShellView>;
}
