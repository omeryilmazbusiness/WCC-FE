export const env = {
  apiBaseUrl:
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/v1",
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "WODI Command Center",
  appShortName: process.env.NEXT_PUBLIC_APP_SHORT_NAME ?? "WCC",
} as const;
