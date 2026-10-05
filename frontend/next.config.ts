import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "out",
  images: { unoptimized: true },
  generateBuildId: () => `build-${Date.now()}`,
};

export default nextConfig;
