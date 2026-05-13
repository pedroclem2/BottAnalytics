import path from "node:path";
import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

loadEnv({ path: path.resolve(__dirname, "..", ".env"), override: false });

const nextConfig: NextConfig = {
  typedRoutes: true,
  serverExternalPackages: ["postgres"],
  /**
   * `standalone` output bundles the server, only the dependencies it
   * actually imports, and a minimal runtime into `.next/standalone/`.
   * This is what we copy into the production Docker image (no need
   * to ship `node_modules`).
   */
  output: "standalone",
};

export default nextConfig;
