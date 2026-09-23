import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "en" | "ar")) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
    // Prod-safe: never throw on a missing leaf — log-friendly fallback string
    getMessageFallback({ namespace, key }) {
      const path = [namespace, key].filter(Boolean).join(".");
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[i18n] MISSING_MESSAGE: ${path} (${locale})`);
      }
      return path;
    },
    onError(error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[i18n] ${error.code}: ${error.message}`);
      }
    },
  };
});
