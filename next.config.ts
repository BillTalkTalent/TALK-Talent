import type { NextConfig } from "next";
import path from "path";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "logo.clearbit.com",
      },
    ],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

// Only wrap with Sentry when DSN is configured — keeps local dev clean
const hasSentry = !!process.env.NEXT_PUBLIC_SENTRY_DSN

export default hasSentry
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,           // Suppress noisy build output
      sourcemaps: { disable: true }, // Don't expose source maps to the browser
      disableLogger: true,
      automaticVercelMonitors: true,
    })
  : nextConfig;
