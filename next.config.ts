import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      '/api/**/*': ['./public/fonts/**/*'],
    },
  },
};

export default nextConfig;
