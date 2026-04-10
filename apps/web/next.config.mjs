import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const distDir = process.env.NODE_ENV === "development" ? ".next-dev" : ".next";
const browserPobTraceRoute = "**/*";
const browserPobTraceIncludes = [
  "../../data/*.txt",
  "../../local-pob-mirror/manifest.xml",
  "../../local-pob-mirror/runtime/lua/**/*.lua",
  "../../local-pob-mirror/src/*.lua",
  "../../local-pob-mirror/src/Assets/**/*.lua",
  "../../local-pob-mirror/src/Classes/**/*.lua",
  "../../local-pob-mirror/src/Data/**/*.lua",
  "../../local-pob-mirror/src/Data/TimelessJewelData/*.zip",
  "../../local-pob-mirror/src/Data/TimelessJewelData/*.zip.part*",
  "../../local-pob-mirror/src/Export/**/*.lua",
  "../../local-pob-mirror/src/Modules/**/*.lua",
  "../../local-pob-mirror/src/TreeData/3_19/Assets.lua",
  "../../local-pob-mirror/src/TreeData/3_27*/**/*.lua",
  "../../local-pob-mirror/src/TreeData/3_28*/**/*.lua",
  "../../local-pob-mirror/src/TreeData/legion/tree-legion.lua",
];
const browserPobExcludedTreeDirs = [
  "2_6",
  "3_6",
  "3_7",
  "3_8",
  "3_9",
  "3_10",
  "3_11",
  "3_12",
  "3_13",
  "3_14",
  "3_15",
  "3_16",
  "3_17",
  "3_18",
  "3_20",
  "3_21",
  "3_22",
  "3_22_ruthless",
  "3_23",
  "3_23_ruthless",
  "3_24",
  "3_24_ruthless",
  "3_25",
  "3_25_alternate",
  "3_25_ruthless",
  "3_25_ruthless_alternate",
  "3_26",
  "3_26_alternate",
  "3_26_ruthless",
  "3_26_ruthless_alternate",
];
const browserPobTraceExcludes = [
  "../../local-pob-mirror/.git/**/*",
  "../../local-pob-mirror/.github/**/*",
  "../../local-pob-mirror/docs/**/*",
  "../../local-pob-mirror/runtime-win32.zip",
  "../../local-pob-mirror/spec/**/*",
  "../../local-pob-mirror/tests/**/*",
  "../../local-pob-mirror/src/**/*.jpeg",
  "../../local-pob-mirror/src/**/*.jpg",
  "../../local-pob-mirror/src/**/*.md",
  "../../local-pob-mirror/src/**/*.png",
  "../../local-pob-mirror/src/**/*.txt",
  "../../local-pob-mirror/src/**/*.webp",
  ...browserPobExcludedTreeDirs.map((treeDir) => `../../local-pob-mirror/src/TreeData/${treeDir}/**/*`),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir,
  outputFileTracingExcludes: {
    [browserPobTraceRoute]: browserPobTraceExcludes,
  },
  outputFileTracingIncludes: {
    [browserPobTraceRoute]: browserPobTraceIncludes,
  },
  reactStrictMode: true,
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        child_process: false,
        fs: false,
        module: false,
        path: false,
        url: false,
      };
    }

    return config;
  },
};

export default nextConfig;
