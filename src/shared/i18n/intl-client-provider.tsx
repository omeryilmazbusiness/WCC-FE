"use client";

import { NextIntlClientProvider } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";

type Props = {
  locale: string;
  messages: AbstractIntlMessages;
  children: React.ReactNode;
};

/**
 * Client-safe intl provider with missing-message fallback.
 * (onError / getMessageFallback cannot cross the RSC boundary.)
 */
export function IntlClientProvider({ locale, messages, children }: Props) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={(error) => {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[i18n] ${error.code}: ${error.message}`);
        }
      }}
      getMessageFallback={({ namespace, key }) =>
        [namespace, key].filter(Boolean).join(".")
      }
    >
      {children}
    </NextIntlClientProvider>
  );
}
