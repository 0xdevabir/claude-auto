import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Parent repo has its own lockfile; keep tracing scoped to this app.
  outputFileTracingRoot: path.join(__dirname),
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
