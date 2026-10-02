import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/shared/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Revisited screens and tab switches reuse the page payload; data is fetched client-side.
    staleTimes: { dynamic: 30 },
  },
};

export default withNextIntl(nextConfig);
