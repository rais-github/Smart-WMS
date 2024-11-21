import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    WEB3_AUTH_CLIENT_ID: process.env.WEB3_AUTH_CLIENT_ID,
    DATABASE_URL: process.env.DATABASE_URL,
  },
};

export default nextConfig;
