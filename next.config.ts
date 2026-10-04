import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/shared/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Revisited screens and tab switches reuse the page payload; data is fetched client-side.
    staleTimes: { dynamic: 30 },
  },
  async headers() {
    return [
      {
        // Versioned location catalogue (scripts/build-geo.py): a data refresh ships under a new version path.
        source: "/geo/:version/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
