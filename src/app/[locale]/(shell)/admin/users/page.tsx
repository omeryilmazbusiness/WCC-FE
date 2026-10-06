import { redirect } from "@/shared/i18n/navigation";
import { routes } from "@/shared/config/routes";

type Props = { params: Promise<{ locale: string }> };

/** The users page became Team; old links and bookmarks land there. */
export default async function AdminUsersPage({ params }: Props) {
  const { locale } = await params;
  redirect({ href: routes.team, locale });
}
