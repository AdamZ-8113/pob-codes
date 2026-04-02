import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const distDir = process.env.NODE_ENV === "development" ? ".next-dev" : ".next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir,
  reactStrictMode: true,
};

export default nextConfig;
