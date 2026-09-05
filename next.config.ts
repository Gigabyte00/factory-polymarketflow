import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DB-backed pages (alerts-feed, whale-tracker, home) can exceed the 60s default
  // when the build coincides with heavy ingest load on the 15M-row holder tables.
  staticPageGenerationTimeout: 180,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "polymarket-upload.s3.us-east-2.amazonaws.com",
      },
    ],
    minimumCacheTTL: 86400,
  },
};

export default nextConfig;
