import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist ships ESM .mjs files; must not be bundled by webpack/turbopack
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
