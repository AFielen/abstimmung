import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  serverExternalPackages: ["read-excel-file", "unzipper"],
  experimental: {
    // Member import accepts files up to 2 MB via a server action; the default
    // body limit is 1 MB and fails such uploads with a generic error.
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default nextConfig;
