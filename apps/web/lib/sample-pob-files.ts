import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface SamplePobFile {
  id: string;
  label: string;
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const sampleDataDir = resolve(repoRoot, "data");

export function listSamplePobFiles(): SamplePobFile[] {
  if (!existsSync(sampleDataDir)) {
    return [];
  }

  return readdirSync(sampleDataDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".txt")
    .map((entry) => ({
      id: entry.name,
      label: entry.name.replace(/\.txt$/i, ""),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function readSamplePobFile(id: string): string | undefined {
  if (!/^[^\\/]+\.txt$/i.test(id)) {
    return undefined;
  }

  const filePath = resolve(sampleDataDir, id);
  if (!filePath.startsWith(`${sampleDataDir}\\`) || !existsSync(filePath)) {
    return undefined;
  }

  return readFileSync(filePath, "utf8");
}
