import type { NextConfig } from "next";
import { PRODUCTION_API_URL } from "./config/urls";

const apiProxyTarget = (
  process.env.API_PROXY_TARGET || PRODUCTION_API_URL
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
