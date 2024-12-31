import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    WEB3_AUTH_CLIENT_ID: process.env.WEB3_AUTH_CLIENT_ID,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_GEMINI_API_KEY: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    GEOLOCATION_API_KEY: process.env.GEOLOCATION_API_KEY,
    REDIS_URL: process.env.REDIS_URL,
    REDIS_SECRET: process.env.REDIS_SECRET,
  },
};

export default nextConfig;
