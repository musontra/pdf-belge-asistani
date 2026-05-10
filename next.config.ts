import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse v2 and its native canvas dep must not be bundled by webpack/turbopack
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
};

export default nextConfig;
