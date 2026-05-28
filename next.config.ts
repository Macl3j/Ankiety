import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer'],
  outputFileTracingIncludes: {
    '/api/**/*': ['./public/fonts/**/*'],
  },
};

export default nextConfig;
