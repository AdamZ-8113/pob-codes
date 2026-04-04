import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const localPobMirrorDir = path.join(repoRoot, "local-pob-mirror");
const sourcePath = path.join(localPobMirrorDir, "src", "Data", "ModItem.lua");
const outputPath = path.join(repoRoot, "packages", "pob-parser", "src", "generated", "pob-mod-order.ts");

const source = fs.readFileSync(sourcePath, "utf8");
const lookup = new Map();

for (const rawLine of source.split(/\r?\n/g)) {
  if (!rawLine.includes("statOrder = {")) {
    continue;
  }

  const typeMatch = rawLine.match(/type = "([^"]+)"/);
  const statOrderMatch = rawLine.match(/statOrder = \{([^}]*)\}/);
  if (!typeMatch || !statOrderMatch) {
    continue;
  }

  const descriptionBlock = rawLine
    .replace(/^.*?affix = "(?:[^"\\]|\\.)*",\s*/, "")
    .replace(/,\s*statOrder = \{[^}]*\}.*$/, "");
  const descriptions = Array.from(descriptionBlock.matchAll(/"((?:[^"\\]|\\.)*)"/g)).map((match) => unescapeLuaString(match[1]));
  const statOrders = statOrderMatch[1]
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value));

  descriptions.forEach((description, index) => {
    const normalized = normalizeModLine(description);
    if (!normalized) {
      return;
    }

    const order = statOrders[index] ?? statOrders[0];
    if (!Number.isFinite(order)) {
      return;
    }

    const existing = lookup.get(normalized);
    if (!existing || order < existing.order) {
      lookup.set(normalized, {
        order,
        type: typeMatch[1],
      });
    }
  });
}

const generated = `/* This file is generated from local-pob-mirror/src/Data/ModItem.lua */
export interface PobModOrderEntry {
  order: number;
  type: string;
}

export const POB_MOD_ORDER_LOOKUP: Record<string, PobModOrderEntry> = ${JSON.stringify(
  Object.fromEntries(Array.from(lookup.entries()).sort((a, b) => a[0].localeCompare(b[0]))),
  null,
  2,
)};
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, generated);

function normalizeModLine(line) {
  return line
    .replace(/\{[^}]+\}/g, "")
    .replace(/\((?:-?\d+(?:\.\d+)?)\s*-\s*(?:-?\d+(?:\.\d+)?)\)/g, "#")
    .replace(/-?\d+(?:\.\d+)?/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function unescapeLuaString(value) {
  return value.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}
