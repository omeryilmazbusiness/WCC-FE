import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { PublicLetterCard } from "@/features/finance-reconciliation";

type Props = {
  params: Promise<{ locale: string; token: string }>;
};

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

/** Public balance confirmation opened from a reconciliation letter link; no session needed. */
export default async function ConfirmLetterPage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  return <PublicLetterCard token={token} />;
}
