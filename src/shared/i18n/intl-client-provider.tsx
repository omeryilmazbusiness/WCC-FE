"use client";

import { useEffect } from "react";
import { NextIntlClientProvider } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import { isRtl } from "./routing";

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
  // Portaled overlays (drawers, dialogs, toasts) render under <body>, outside the
  // locale wrapper, so the document itself must carry the language and direction.
  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = isRtl(locale) ? "rtl" : "ltr";
  }, [locale]);

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
