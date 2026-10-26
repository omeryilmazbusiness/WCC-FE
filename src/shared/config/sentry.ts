const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

export const sentryEnabled = dsn.length > 0;

export const sentryOptions = {
  dsn,
  enabled: sentryEnabled,
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
    process.env.APP_ENV ??
    process.env.NODE_ENV,
  release:
    process.env.NEXT_PUBLIC_SENTRY_RELEASE ??
    (process.env.NEXT_PUBLIC_APP_SHORT_NAME
      ? `${process.env.NEXT_PUBLIC_APP_SHORT_NAME}@${process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0"}`
      : undefined),
  sendDefaultPii: false,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
  tracePropagationTargets: ["localhost", /^https?:\/\/localhost:\d+/, /^\/api\//] as (string | RegExp)[],
};
