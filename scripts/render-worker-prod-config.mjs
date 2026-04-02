import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const templatePath = resolve("apps/worker/wrangler.prod.toml.template");
const outputPath = resolve("apps/worker/.wrangler/deploy.toml");
const replacements = {
  "__CF_KV_BUILD_CODES_ID__": process.env.CF_KV_BUILD_CODES_ID?.trim() ?? "",
  "__CF_KV_BUILD_CODES_PREVIEW_ID__": process.env.CF_KV_BUILD_CODES_PREVIEW_ID?.trim() ?? "",
};

const missing = Object.entries(replacements)
  .filter(([, value]) => !value)
  .map(([key]) => key.replaceAll("__", ""));

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}. ` +
      "Set them locally before manual deploys, or add them as GitHub repository variables.",
  );
}

const template = await readFile(templatePath, "utf8");
let output = template;
for (const [token, value] of Object.entries(replacements)) {
  output = output.replaceAll(token, value);
}

if (output.includes("__CF_KV_BUILD_CODES_")) {
  throw new Error("Worker deployment config still contains unresolved placeholders.");
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, output, "utf8");

console.log(`Wrote ${outputPath}`);
