import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "profile.mezon.ai",
      },
      {
        protocol: "https",
        hostname: "imgproxy.mezon.ai",
      },
      {
        protocol: "https",
        hostname: "scontent.fdad3-4.fna.fbcdn.net",
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
