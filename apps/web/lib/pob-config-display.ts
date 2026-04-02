import type { ConfigValue } from "@pobcodes/shared-types";

import { POB_CONFIG_OPTIONS, type PobConfigChoice, type PobConfigOption } from "./generated/pob-config-options";

export interface ConfigDisplayRow {
  key: string;
  label: string;
  type: "custom" | "toggle" | "value";
  value?: string;
}

export interface ConfigDisplaySection {
  column?: number;
  key: string;
  rows: ConfigDisplayRow[];
  title: string;
}

const configOptionsByKey = new Map(POB_CONFIG_OPTIONS.map((option) => [option.key, option]));

export function buildConfigDisplaySections(inputs: Record<string, ConfigValue>): ConfigDisplaySection[] {
  const sectionsByKey = new Map<string, ConfigDisplaySection>();
  const orderedSections: ConfigDisplaySection[] = [];
  const remainingInputs = new Map(Object.entries(inputs));

  for (const option of POB_CONFIG_OPTIONS) {
    if (!remainingInputs.has(option.key)) {
      continue;
    }

    const value = remainingInputs.get(option.key);
    remainingInputs.delete(option.key);
    if (value === undefined || shouldHideConfigValue(option, value)) {
      continue;
    }

    const section = getOrCreateSection(option, sectionsByKey, orderedSections);
    if (option.key === "customMods" && typeof value === "string") {
      for (const line of value.split(/\r?\n/g).map((entry) => entry.trim()).filter(Boolean)) {
        section.rows.push({
          key: `${option.key}:${line}`,
          label: line,
          type: "custom",
        });
      }
      continue;
    }

    if (typeof value === "boolean") {
      section.rows.push({
        key: option.key,
        label: getConfigOptionDisplayLabel(option),
        type: "toggle",
      });
      continue;
    }

    section.rows.push({
      key: option.key,
      label: getConfigOptionDisplayLabel(option),
      type: "value",
      value: formatConfigValue(option, value),
    });
  }

  for (const [key, value] of remainingInputs) {
    if (shouldHideUnknownConfigValue(value)) {
      continue;
    }

    const section = getOrCreateSection(
      {
        key: "__other__",
        section: "Other",
      },
      sectionsByKey,
      orderedSections,
    );

    if (key === "customMods" && typeof value === "string") {
      for (const line of value.split(/\r?\n/g).map((entry) => entry.trim()).filter(Boolean)) {
        section.rows.push({
          key: `${key}:${line}`,
          label: line,
          type: "custom",
        });
      }
      continue;
    }

    if (typeof value === "boolean") {
      section.rows.push({
        key,
        label: humanizeConfigKey(key),
        type: "toggle",
      });
      continue;
    }

    section.rows.push({
      key,
      label: humanizeConfigKey(key),
      type: "value",
      value: String(value),
    });
  }

  return orderedSections.filter((section) => section.rows.length > 0);
}

export function compactConfigDisplaySections(
  sections: ConfigDisplaySection[],
  columnCount = 3,
): ConfigDisplaySection[] {
  if (sections.length <= 1 || columnCount <= 1) {
    return sections;
  }

  const columns = Array.from({ length: columnCount }, () => [] as ConfigDisplaySection[]);

  for (const section of sections) {
    const columnIndex =
      section.column && section.column >= 1 && section.column <= columnCount ? section.column - 1 : 0;
    columns[columnIndex].push(section);
  }

  const ordered: ConfigDisplaySection[] = [];
  for (let rowIndex = 0; ; rowIndex += 1) {
    let addedAny = false;

    for (const column of columns) {
      const section = column[rowIndex];
      if (!section) {
        continue;
      }

      ordered.push(section);
      addedAny = true;
    }

    if (!addedAny) {
      break;
    }
  }

  return ordered;
}

function getOrCreateSection(
  option: Pick<PobConfigOption, "column" | "key" | "section">,
  sectionsByKey: Map<string, ConfigDisplaySection>,
  orderedSections: ConfigDisplaySection[],
) {
  const sectionKey = option.section ?? "Other";
  const existing = sectionsByKey.get(sectionKey);
  if (existing) {
    return existing;
  }

  const created: ConfigDisplaySection = {
    ...(option.column ? { column: option.column } : {}),
    key: sectionKey,
    rows: [],
    title: sectionKey,
  };
  sectionsByKey.set(sectionKey, created);
  orderedSections.push(created);
  return created;
}

function shouldHideConfigValue(option: PobConfigOption, value: ConfigValue) {
  if (option.key === "customMods") {
    return typeof value !== "string" || value.trim().length === 0;
  }

  if (typeof value === "boolean") {
    return value === false || isSameConfigValue(value, option.defaultValue);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return true;
    }

    return isSameConfigValue(trimmed, option.defaultValue);
  }

  if (typeof value === "number") {
    if (option.defaultValue !== undefined) {
      return isSameConfigValue(value, option.defaultValue);
    }

    return value === 0;
  }

  return false;
}

function shouldHideUnknownConfigValue(value: ConfigValue) {
  if (typeof value === "boolean") {
    return value === false;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  if (typeof value === "number") {
    return value === 0;
  }

  return false;
}

function formatConfigValue(option: PobConfigOption, value: ConfigValue) {
  const choiceLabel = resolveConfigChoiceLabel(option.choices, value);
  if (choiceLabel) {
    return choiceLabel;
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  }

  return String(value);
}

function resolveConfigChoiceLabel(choices: PobConfigChoice[] | undefined, value: ConfigValue) {
  if (!choices) {
    return undefined;
  }

  return choices.find((choice) => isSameConfigValue(choice.value, value))?.label;
}

function getConfigOptionDisplayLabel(option: PobConfigOption) {
  return normalizeConfigDisplayLabel(option.label ?? humanizeConfigKey(option.key));
}

function humanizeConfigKey(key: string): string {
  return key
    .replace(/^condition/, "")
    .replace(/^override/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\bDps\b/g, "DPS")
    .replace(/\bEs\b/g, "ES")
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

function normalizeConfigDisplayLabel(label: string): string {
  return label
    .replace(/\^x[0-9A-Fa-f]{6}/g, "")
    .replace(/\^[0-9]/g, "")
    .replace(/:$/, "")
    .replace(/\?$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isSameConfigValue(left: boolean | number | string | undefined, right: ConfigValue | undefined) {
  if (left === undefined || right === undefined) {
    return false;
  }

  if (typeof left === "number" && typeof right === "number") {
    return left === right;
  }

  if (typeof left === "boolean" && typeof right === "boolean") {
    return left === right;
  }

  return String(left) === String(right);
}
