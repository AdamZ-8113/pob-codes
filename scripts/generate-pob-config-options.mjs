import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const localPobMirrorDir = path.join(repoRoot, "local-pob-mirror");
const sourcePath = path.join(localPobMirrorDir, "src", "Modules", "ConfigOptions.lua");
const outputPath = path.join(repoRoot, "apps", "web", "lib", "generated", "pob-config-options.ts");

const source = fs.readFileSync(sourcePath, "utf8");
const options = parseConfigOptions(source);

const generated = `/* This file is generated from local-pob-mirror/src/Modules/ConfigOptions.lua */
export interface PobConfigChoice {
  label: string;
  value: boolean | number | string;
}

export interface PobConfigOption {
  choices?: PobConfigChoice[];
  column?: number;
  defaultValue?: boolean | number | string;
  key: string;
  label?: string;
  section?: string;
  type?: string;
}

export const POB_CONFIG_OPTIONS: PobConfigOption[] = ${JSON.stringify(options, null, 2)};
`;

fs.writeFileSync(outputPath, generated);

function parseConfigOptions(input) {
  const options = [];
  const seen = new Set();
  let currentSection;
  let currentColumn;
  let chunkLines = [];
  let chunkDepth = 0;

  for (const rawLine of input.split(/\r?\n/g)) {
    const line = rawLine.trim();
    if (chunkLines.length === 0) {
      if (!line.startsWith("{") || (!line.includes('var = "') && !line.includes('section = "'))) {
        continue;
      }

      chunkLines.push(rawLine);
      chunkDepth = countBraceDelta(rawLine);
      if (chunkDepth <= 0) {
        flushChunk(chunkLines.join("\n"));
        chunkLines = [];
        chunkDepth = 0;
      }
      continue;
    }

    chunkLines.push(rawLine);
    chunkDepth += countBraceDelta(rawLine);
    if (chunkDepth > 0) {
      continue;
    }

    flushChunk(chunkLines.join("\n"));
    chunkLines = [];
    chunkDepth = 0;
  }

  function flushChunk(chunk) {
    const section = chunk.match(/section\s*=\s*"([^"]+)"/)?.[1];
    if (section) {
      currentSection = normalizeLabel(section);
      const column = Number(chunk.match(/col\s*=\s*(\d+)/)?.[1]);
      currentColumn = Number.isFinite(column) ? column : undefined;
      return;
    }

    const key = chunk.match(/var\s*=\s*"([^"]+)"/)?.[1];
    if (!key || seen.has(key)) {
      return;
    }

    const type = chunk.match(/type\s*=\s*"([^"]+)"/)?.[1];
    const rawLabel = chunk.match(/label\s*=\s*"([^"]*)"/)?.[1];
    const label = normalizeLabel(rawLabel, key);
    const defaultState = parseLuaLiteral(chunk.match(/defaultState\s*=\s*([^,\n}]+)/)?.[1]);
    const defaultIndex = Number(chunk.match(/defaultIndex\s*=\s*(\d+)/)?.[1]);
    const choices = extractListChoices(chunk);
    const defaultValue =
      defaultState ??
      (Number.isFinite(defaultIndex) && defaultIndex > 0 ? choices[defaultIndex - 1]?.value : undefined) ??
      (type === "list" && choices.length > 0 ? choices[0]?.value : undefined) ??
      (type === "check" ? false : undefined) ??
      (isNumericConfigType(type) ? 0 : undefined);

    options.push({
      ...(choices.length > 0 ? { choices } : {}),
      ...(currentColumn ? { column: currentColumn } : {}),
      ...(defaultValue !== undefined ? { defaultValue } : {}),
      key,
      ...(label ? { label } : {}),
      ...(currentSection ? { section: currentSection } : {}),
      ...(type ? { type } : {}),
    });
    seen.add(key);
  }

  return options;
}

function normalizeLabel(rawLabel, key) {
  const normalized = (rawLabel ?? "")
    .replace(/\^x[0-9A-Fa-f]{6}/g, "")
    .replace(/\^[0-9]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/:$/, "");

  if (normalized) {
    return normalized;
  }

  if (key === "customMods") {
    return "Custom Modifiers";
  }

  return undefined;
}

function countBraceDelta(input) {
  let delta = 0;
  let inString = false;
  let escapeNext = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const nextCharacter = input[index + 1];

    if (!inString && character === "-" && nextCharacter === "-") {
      break;
    }

    if (inString) {
      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (character === "\\") {
        escapeNext = true;
        continue;
      }

      if (character === "\"") {
        inString = false;
      }
      continue;
    }

    if (character === "\"") {
      inString = true;
      continue;
    }

    if (character === "{") {
      delta += 1;
      continue;
    }

    if (character === "}") {
      delta -= 1;
    }
  }

  return delta;
}

function extractListChoices(chunk) {
  const listAssignment = chunk.match(/list\s*=\s*(\{)/);
  if (!listAssignment || listAssignment.index == null) {
    return [];
  }

  const listStart = chunk.indexOf("{", listAssignment.index);
  if (listStart < 0) {
    return [];
  }

  const listBlock = extractBalancedBraces(chunk, listStart);
  if (!listBlock) {
    return [];
  }

  const choices = [];
  let index = 0;
  while (index < listBlock.content.length) {
    const nextBrace = listBlock.content.indexOf("{", index);
    if (nextBrace < 0) {
      break;
    }

    const choiceBlock = extractBalancedBraces(listBlock.content, nextBrace);
    if (!choiceBlock) {
      break;
    }

    const valueLiteral = choiceBlock.content.match(/val\s*=\s*([^,\n}]+)/)?.[1];
    const rawLabel = choiceBlock.content.match(/label\s*=\s*"([^"]*)"/)?.[1];
    const value = parseLuaLiteral(valueLiteral);
    const label = normalizeLabel(rawLabel);
    if ((typeof value === "string" || typeof value === "number" || typeof value === "boolean") && label) {
      choices.push({ label, value });
    }

    index = choiceBlock.end;
  }

  return choices;
}

function extractBalancedBraces(input, startIndex) {
  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let index = startIndex; index < input.length; index += 1) {
    const character = input[index];

    if (inString) {
      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (character === "\\") {
        escapeNext = true;
        continue;
      }

      if (character === "\"") {
        inString = false;
      }
      continue;
    }

    if (character === "\"") {
      inString = true;
      continue;
    }

    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return {
          content: input.slice(startIndex + 1, index),
          end: index + 1,
        };
      }
    }
  }

  return undefined;
}

function parseLuaLiteral(rawValue) {
  if (!rawValue) {
    return undefined;
  }

  const literal = rawValue.trim();
  if (!literal) {
    return undefined;
  }

  if (literal === "true") {
    return true;
  }

  if (literal === "false") {
    return false;
  }

  if (literal.startsWith("\"") && literal.endsWith("\"")) {
    return literal.slice(1, -1);
  }

  const numberValue = Number(literal);
  if (Number.isFinite(numberValue)) {
    return numberValue;
  }

  return undefined;
}

function isNumericConfigType(type) {
  return type === "count" || type === "countAllowZero" || type === "float" || type === "integer";
}
