import { hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { IntlClientProvider } from "@/shared/i18n/intl-client-provider";
import { isRtl, routing } from "@/shared/i18n/routing";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = isRtl(locale) ? "rtl" : "ltr";

  return (
    <IntlClientProvider locale={locale} messages={messages}>
      <div lang={locale} dir={dir} className="min-h-screen">
        {children}
      </div>
    </IntlClientProvider>
  );
}
