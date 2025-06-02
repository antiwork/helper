import { createMDX } from "fumadocs-mdx/next";

/** @type {import('next').NextConfig} */
let nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@helperai/react"],
  images: {
    domains: ["helper.ai", "helperai.dev", "localhost", "vercel.com"],
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
};

const withMDX = createMDX({ configPath: "./content/source.config.ts" });
nextConfig = withMDX(nextConfig);

export default nextConfig;
