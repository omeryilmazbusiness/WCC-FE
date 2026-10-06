import { redirect } from "@/shared/i18n/navigation";
import { SETTINGS_ROOT } from "@/shared/config/settings";

type Props = { params: Promise<{ locale: string }> };

/** The audit log moved into settings; old links and bookmarks land there. */
export default async function AdminAuditPage({ params }: Props) {
  const { locale } = await params;
  redirect({ href: `${SETTINGS_ROOT}/audit`, locale });
}
