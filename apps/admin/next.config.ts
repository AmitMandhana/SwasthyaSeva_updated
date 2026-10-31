import type { NextConfig } from "next";
import { DEV_MODE } from "./lib/env";

const nextConfig: NextConfig = {
  env: { DEV_MODE: process.env.DEV_MODE || '' },
  devIndicators: false,
  compiler: {
    reactRemoveProperties: !DEV_MODE
      ? { properties: ['^data-testid$'] }
      : false,
  },
  async headers() {
    if (process.env.NODE_ENV !== 'production') {
      return [{ source: '/:path*', headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }] }];
    }
    return [];
  },
};

export default nextConfig;
