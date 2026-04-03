"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";

import type { BuildPayload, ItemExplicitModPayload, ItemPayload, ItemSlotPayload } from "@pobcodes/shared-types";

import { getItemSetLabel, getSelectedItemSet, getSelectedTreeSpec } from "../lib/build-viewer-selection";
import { resolveInfluenceIconPath, resolveItemIconCandidates } from "../lib/icon-paths";
import { isWeaponSwapSlot } from "../lib/weapon-swap";

const equipmentLayout: Array<{ area: string; slotName: string }> = [
  { area: "weapon-main", slotName: "Weapon 1" },
  { area: "ring-third", slotName: "Ring 3" },
  { area: "ring-left", slotName: "Ring 1" },
  { area: "amulet", slotName: "Amulet" },
  { area: "helmet", slotName: "Helmet" },
  { area: "weapon-off", slotName: "Weapon 2" },
  { area: "gloves", slotName: "Gloves" },
  { area: "body-armour", slotName: "Body Armour" },
  { area: "ring-right", slotName: "Ring 2" },
  { area: "boots", slotName: "Boots" },
  { area: "belt", slotName: "Belt" },
];
const NAMELESS_BLOODLINE_ASCENDANCY_ID = 6;

const flaskSlots = ["Flask 1", "Flask 2", "Flask 3", "Flask 4", "Flask 5"];
const equipmentSlotNames = new Set([...equipmentLayout.map((entry) => entry.slotName), ...flaskSlots]);
const tooltipLeftAreas = new Set(["amulet", "ring-right", "weapon-off", "boots"]);
const itemInfluenceLines = new Set([
  "Shaper Item",
  "Elder Item",
  "Crusader Item",
  "Hunter Item",
  "Redeemer Item",
  "Warlord Item",
  "Searing Exarch Item",
  "Eater of Worlds Item",
]);

export function resetFoulbornIconAvailabilityCacheForTests(): void {
  // No-op: kept only so older tests/imports don't break when foulborn icon
  // resolution no longer relies on runtime availability probes.
}
const itemNonModLines = new Set([
  "Corrupted",
  "Fractured Item",
  "Mirrored",
  "Mirrored Item",
  "Split",
  "Split Item",
  "Synthesised Item",
  "Unidentified",
]);
const itemPropertyPrefixes = [
  "Unique ID:",
  "Item Level:",
  "Quality:",
  "Sockets:",
  "LevelReq:",
  "Requires Class ",
  "Radius:",
  "Limited to:",
  "Armour:",
  "Evasion:",
  "Evasion Rating:",
  "Energy Shield:",
  "Ward:",
  "League:",
  "Catalyst:",
  "CatalystQuality:",
  "Talisman Tier:",
  "Variant:",
  "Selected Variant:",
  "Selected Alt Variant:",
  "Selected Alt Variant Two:",
  "Selected Alt Variant Three:",
  "Selected Alt Variant Four:",
  "Selected Alt Variant Five:",
  "Has Alt Variant",
  "Note:",
  "Class: ",
  "Prefixes:",
  "Suffixes:",
];
const selectedVariantPrefix = "Selected Variant:";
const FOIL_TYPE_RGB: Record<string, string> = {
  Rainbow: "153 255 128",
  Amethyst: "230 153 255",
  Verdant: "128 255 128",
  Ruby: "255 128 153",
  Cobalt: "153 179 255",
  Sunset: "255 255 153",
  Aureate: "255 217 51",
  "Celestial Quartz": "255 179 217",
  "Celestial Ruby": "204 77 51",
  "Celestial Emerald": "51 153 77",
  "Celestial Aureate": "204 179 51",
  "Celestial Pearl": "255 217 230",
  "Celestial Amethyst": "128 153 255",
};

function getInitialItemSetId(payload: BuildPayload): number | undefined {
  return payload.activeItemSetId ?? payload.itemSets.find((set) => set.active)?.id ?? payload.itemSets[0]?.id;
}

function getTooltipSide(area: string): "left" | "right" | "above" {
  if (area.startsWith("flask") || area.startsWith("extra") || area.startsWith("jewel")) {
    return "above";
  }

  return tooltipLeftAreas.has(area) ? "left" : "right";
}

function getEquipmentGridArea(area: string): string | undefined {
  if (area.startsWith("flask") || area.startsWith("extra") || area.startsWith("jewel")) {
    return undefined;
  }

  if (area === "weapon-main") return "weapon";
  if (area === "ring-third") return "ring3";
  if (area === "ring-left") return "ringl";
  if (area === "helmet") return "helm";
  if (area === "amulet") return "amulet";
  if (area === "weapon-off") return "offhand";
  if (area === "gloves") return "gloves";
  if (area === "body-armour") return "body";
  if (area === "ring-right") return "ringr";
  if (area === "boots") return "boots";
  if (area === "belt") return "belt";
  return undefined;
}

function isFoulbornItem(item?: ItemPayload): boolean {
  return Boolean(item && [item.name, item.iconKey].some((value) => value?.startsWith("Foulborn ")));
}

function isCorruptedItem(item?: ItemPayload): boolean {
  return Boolean(item?.corrupted);
}

function getFoilRgb(foilType?: string): string {
  return (foilType && FOIL_TYPE_RGB[foilType]) || FOIL_TYPE_RGB.Rainbow;
}

interface TooltipLine {
  key: string;
  className: string;
  content: React.ReactNode;
  iconSrc?: string;
}

interface TooltipSection {
  key: string;
  lines: TooltipLine[];
}

interface ResolvedItemIconProps {
  alt: string;
  candidates: string[];
  mirrored?: boolean;
}

function ResolvedItemIcon({ alt, candidates, mirrored = false }: ResolvedItemIconProps) {
  const candidatesKey = candidates.join("\n");
  const [failedCount, setFailedCount] = useState(0);
  const resolvedSrc = candidates[failedCount];

  useEffect(() => {
    setFailedCount(0);
  }, [candidatesKey]);

  if (!resolvedSrc) {
    return null;
  }

  return (
    <img
      className={`gear-item-icon${mirrored ? " gear-item-icon--mirrored" : ""}`}
      src={resolvedSrc}
      alt={alt}
      loading="lazy"
      onError={() => {
        setFailedCount((current) => current + 1);
      }}
    />
  );
}

function buildHeaderIcons(item: ItemPayload): [string?, string?] {
  const hasExarch = item.influences.includes("Searing Exarch Item");
  const hasEater = item.influences.includes("Eater of Worlds Item");

  if (hasExarch && hasEater) {
    return ["Searing Exarch Item", "Eater of Worlds Item"];
  }

  const icons: string[] = [];
  if (item.fractured) {
    icons.push("Fractured Item");
  }

  for (const influence of [
    "Searing Exarch Item",
    "Eater of Worlds Item",
    "Shaper Item",
    "Elder Item",
    "Crusader Item",
    "Redeemer Item",
    "Hunter Item",
    "Warlord Item",
  ]) {
    if (!item.influences.includes(influence)) {
      continue;
    }

    if (!icons.includes(influence)) {
      icons.push(influence);
    }

    if (icons.length === 2) {
      break;
    }
  }

  if (icons.length === 0 && item.synthesised) {
    icons.push("Synthesised Item");
  }

  if (icons.length === 1) {
    icons.push(icons[0]);
  }

  return [icons[0], icons[1]];
}

function buildExplicitLines(item: ItemPayload): TooltipLine[] {
  const orderedExplicitMods = item.orderedExplicitMods?.length ? item.orderedExplicitMods : deriveOrderedExplicitModsFromRaw(item);

  if (orderedExplicitMods?.length) {
    return orderedExplicitMods.map((line, index) => ({
      key: `explicit:${index}:${line.kind}:${line.text}`,
      className:
        line.kind === "crafted"
          ? "poe-mod poe-mod-crafted"
          : line.kind === "fractured"
            ? "poe-mod poe-mod-fractured"
            : "poe-mod",
      content: <span>{line.text}</span>,
    }));
  }

  return [
    ...item.explicits.map((text, index) => ({
      key: `explicit:${index}:${text}`,
      className: "poe-mod",
      content: <span>{text}</span>,
    })),
    ...item.fracturedMods.map((text, index) => ({
      key: `fractured:${index}:${text}`,
      className: "poe-mod poe-mod-fractured",
      content: <span>{text}</span>,
    })),
    ...item.crafted.map((text, index) => ({
      key: `crafted:${index}:${text}`,
      className: "poe-mod poe-mod-crafted",
      content: <span>{text}</span>,
    })),
  ];
}

function deriveOrderedExplicitModsFromRaw(item: ItemPayload): ItemExplicitModPayload[] | undefined {
  if (!item.raw) {
    return undefined;
  }

  const lines = item.raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^[-]+$/.test(line));

  const rarity = parseItemRarity(lines[0]);
  const { name, base } = parseItemNameAndBase(lines, rarity);
  const implicitInfo = findImplicitInfo(lines);
  const selectedVariant = parseSelectedVariant(lines);
  const orderedExplicitMods: ItemExplicitModPayload[] = [];
  let implicitLinesRemaining = implicitInfo.count;

  for (let index = implicitInfo.nextIndex; index < lines.length; index += 1) {
    const line = lines[index];
    if (isSkippableRawLine(line, name, base)) {
      continue;
    }

    const clean = formatRawDisplayLine(line);
    if (!clean) {
      continue;
    }

    if (!matchesSelectedVariant(line, selectedVariant)) {
      continue;
    }

    const inImplicitBlock = implicitLinesRemaining > 0;

    if (line.includes("{fractured}")) {
      orderedExplicitMods.push({ text: clean, kind: "fractured" });
      continue;
    }

    if (shouldTreatRawLineAsAnoint(line, clean, inImplicitBlock)) {
      if (inImplicitBlock) {
        implicitLinesRemaining -= 1;
      }
      continue;
    }

    if (line.includes("{crafted}") && inImplicitBlock) {
      implicitLinesRemaining -= 1;
      continue;
    }

    if (line.includes("{crafted}")) {
      orderedExplicitMods.push({ text: clean, kind: "crafted" });
      continue;
    }

    if (line.includes("{enchant}") || line.includes("{scourge}") || line.includes("{synthesis}")) {
      if (inImplicitBlock) {
        implicitLinesRemaining -= 1;
      }
      continue;
    }

    if (line.includes("{crucible}")) {
      continue;
    }

    if (inImplicitBlock) {
      implicitLinesRemaining -= 1;
      continue;
    }

    orderedExplicitMods.push({ text: clean, kind: "explicit" });
  }

  return orderedExplicitMods.length > 0 ? orderedExplicitMods : undefined;
}

function parseSelectedVariant(lines: string[]): number | undefined {
  const line = lines.find((entry) => entry.startsWith(selectedVariantPrefix));
  if (!line) {
    return undefined;
  }

  const value = Number(line.slice(selectedVariantPrefix.length).trim());
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function buildStatSections(item: ItemPayload): TooltipSection[] {
  const sections: TooltipSection[] = [];
  const detailLines: TooltipLine[] = [];
  const requirementLines: TooltipLine[] = [];

  if (item.quality && item.quality > 0) {
    detailLines.push(buildPropertyLine("Quality", `+${item.quality}%`));
  }
  if (item.armour && item.armour > 0) {
    detailLines.push(buildPropertyLine("Armour", item.armour.toLocaleString("en-US")));
  }
  if (item.evasion && item.evasion > 0) {
    detailLines.push(buildPropertyLine("Evasion Rating", item.evasion.toLocaleString("en-US")));
  }
  if (item.energyShield && item.energyShield > 0) {
    detailLines.push(buildPropertyLine("Energy Shield", item.energyShield.toLocaleString("en-US")));
  }
  if (item.ward && item.ward > 0) {
    detailLines.push(buildPropertyLine("Ward", item.ward.toLocaleString("en-US")));
  }
  if (item.sockets) {
    detailLines.push({
      key: "stat:sockets",
      className: "poe-stat poe-stat-sockets",
      content: (
        <>
          <span className="poe-stat-label">Sockets: </span>
          <span className="poe-socket-row">{renderSocketSpec(item.sockets)}</span>
        </>
      ),
    });
  }

  if (detailLines.length > 0) {
    sections.push({
      key: "details",
      lines: detailLines,
    });
  }

  if (item.requirements?.className) {
    requirementLines.push({
      key: "stat:requires-class",
      className: "poe-stat poe-stat-requires",
      content: (
        <>
          <span className="poe-stat-label">Requires Class </span>
          <span className="poe-requirement-value">{item.requirements.className}</span>
        </>
      ),
    });
  }

  const requirementParts = buildRequirementParts(item);
  if (requirementParts.length > 0) {
    requirementLines.push({
      key: "stat:requires",
      className: "poe-stat poe-stat-requires",
      content: (
        <>
          <span className="poe-stat-label">Requires </span>
          <span className="poe-requirement-row">{joinInlineParts(requirementParts)}</span>
        </>
      ),
    });
  }

  if (requirementLines.length > 0) {
    sections.push({
      key: "requirements",
      lines: requirementLines,
    });
  }

  return sections;
}

function buildModifierSections(item: ItemPayload): TooltipSection[] {
  const sections: TooltipSection[] = [];
  const itemAnointments = item.anointments ?? [];
  const itemEnchantments = item.enchantments ?? [];
  const anointments = itemAnointments.length > 0 ? itemAnointments : itemEnchantments.filter((text) => isAnointmentText(text));
  const enchantments = itemEnchantments.filter((text) => !isAnointmentText(text));

  if (anointments.length > 0) {
    sections.push({
      key: "anointments",
      lines: anointments.map((text, index) => ({
        key: `anointment:${index}:${text}`,
        className: "poe-mod poe-mod-anoint",
        content: <span>{text}</span>,
      })),
    });
  }

  if (enchantments.length > 0) {
    sections.push({
      key: "enchantments",
      lines: enchantments.map((text, index) => ({
        key: `enchant:${index}:${text}`,
        className: "poe-mod poe-mod-enchant",
        content: <span>{text}</span>,
      })),
    });
  }

  if (item.scourgedMods.length > 0) {
    sections.push({
      key: "scourged",
      lines: item.scourgedMods.map((text, index) => ({
        key: `scourged:${index}:${text}`,
        className: "poe-mod poe-mod-scourged",
        content: <span>{text}</span>,
      })),
    });
  }

  if (item.synthesizedMods.length > 0 || item.implicits.length > 0) {
    sections.push({
      key: "implicits",
      lines: [
        ...item.synthesizedMods.map((text, index) => ({
          key: `synthesized:${index}:${text}`,
          className: "poe-mod poe-mod-synthesized",
          content: <span>{text}</span>,
        })),
        ...item.implicits.map((text, index) => ({
          key: `implicit:${index}:${text}`,
          className: "poe-mod",
          content: <span>{text}</span>,
        })),
      ],
    });
  }

  const explicitLines = buildExplicitLines(item);
  if (explicitLines.length > 0) {
    sections.push({
      key: "explicits",
      lines: explicitLines,
    });
  }

  if (item.crucibleMods.length > 0) {
    sections.push({
      key: "crucible",
      lines: item.crucibleMods.map((text, index) => ({
        key: `crucible:${index}:${text}`,
        className: "poe-mod poe-mod-crucible",
        content: <span>{text}</span>,
      })),
    });
  }

  return sections;
}

function buildFooterFlagLines(item: ItemPayload): TooltipLine[] {
  const footerLines: TooltipLine[] = [];

  if (isDisplaySplitItem(item)) {
    footerLines.push({
      key: "footer:split",
      className: "poe-mod poe-mod-split",
      content: <span>Split</span>,
    });
  }

  if (isDisplayMirroredItem(item)) {
    footerLines.push({
      key: "footer:mirrored",
      className: "poe-mod poe-mod-mirrored",
      content: <span>Mirrored</span>,
    });
  }

  if (item.corrupted) {
    footerLines.push({
      key: "footer:corrupted",
      className: "poe-mod poe-mod-corrupted",
      content: <span>Corrupted</span>,
    });
  }

  return footerLines;
}

function isDisplaySplitItem(item: ItemPayload): boolean {
  return item.split || hasRawItemFlag(item.raw, "Split");
}

function isDisplayMirroredItem(item: ItemPayload): boolean {
  return item.mirrored || hasRawItemFlag(item.raw, "Mirrored") || isInherentlyMirroredItem(item);
}

function hasRawItemFlag(raw: string | undefined, flag: "Mirrored" | "Split"): boolean {
  if (!raw) {
    return false;
  }

  return raw
    .split(/\r?\n/)
    .map((line) => stripRawLineTags(line))
    .some((line) => matchesStandaloneItemFlag(line, flag));
}

function matchesStandaloneItemFlag(line: string, flag: "Mirrored" | "Split"): boolean {
  return line === flag || line === `${flag} Item`;
}

function isInherentlyMirroredItem(item: ItemPayload): boolean {
  return item.name === "Kalandra's Touch" && item.base === "Ring";
}

function buildPropertyLine(label: string, value: string): TooltipLine {
  return {
    key: `stat:${label}`,
    className: "poe-stat",
    content: (
      <>
        <span className="poe-stat-label">{label}: </span>
        <span className="poe-stat-value">{value}</span>
      </>
    ),
  };
}

function buildRequirementParts(item: ItemPayload): React.ReactNode[] {
  const parts: React.ReactNode[] = [];

  if (item.requirements?.level && item.requirements.level > 0) {
    parts.push(
      <React.Fragment key="req:level">
        <span className="poe-stat-label">Level </span>
        <span className="poe-requirement-value">{item.requirements.level}</span>
      </React.Fragment>,
    );
  }
  if ((item.requirements?.str ?? 0) > 14) {
    parts.push(
      <React.Fragment key="req:str">
        <span className="poe-requirement-value">{item.requirements?.str}</span>
        <span className="poe-stat-label"> Str</span>
      </React.Fragment>,
    );
  }
  if ((item.requirements?.dex ?? 0) > 14) {
    parts.push(
      <React.Fragment key="req:dex">
        <span className="poe-requirement-value">{item.requirements?.dex}</span>
        <span className="poe-stat-label"> Dex</span>
      </React.Fragment>,
    );
  }
  if ((item.requirements?.int ?? 0) > 14) {
    parts.push(
      <React.Fragment key="req:int">
        <span className="poe-requirement-value">{item.requirements?.int}</span>
        <span className="poe-stat-label"> Int</span>
      </React.Fragment>,
    );
  }

  return parts;
}

function joinInlineParts(parts: React.ReactNode[]): React.ReactNode {
  return parts.map((part, index) => (
    <React.Fragment key={`joined:${index}`}>
      {index > 0 && <span className="poe-stat-label">, </span>}
      {part}
    </React.Fragment>
  ));
}

function renderSocketSpec(socketSpec: string): React.ReactNode {
  return socketSpec.replace(/-/g, "=").split("").map((char, index) => {
    if (char === " ") {
      return (
        <span key={`socket:${index}`} className="poe-socket-separator">
          {" "}
        </span>
      );
    }

    if (char === "=") {
      return (
        <span key={`socket:${index}`} className="poe-socket-separator">
          =
        </span>
      );
    }

    return (
      <span key={`socket:${index}`} className={`poe-socket poe-socket-${char.toLowerCase()}`}>
        {char}
      </span>
    );
  });
}

function parseItemRarity(line?: string): ItemPayload["rarity"] | undefined {
  if (!line) {
    return undefined;
  }

  const match = line.match(/^Rarity:\s+(\w+)/);
  if (!match) {
    return undefined;
  }

  const value = match[1].toLowerCase();
  if (value === "normal") return "Normal";
  if (value === "magic") return "Magic";
  if (value === "rare") return "Rare";
  if (value === "unique") return "Unique";
  if (value === "relic") return "Relic";
  return undefined;
}

function parseItemNameAndBase(lines: string[], rarity?: ItemPayload["rarity"]): { name?: string; base?: string } {
  if (lines.length < 2) {
    return {};
  }

  if (rarity === "Rare" || rarity === "Unique" || rarity === "Relic") {
    return {
      name: lines[1],
      base: lines[2] ?? lines[1],
    };
  }

  return {
    name: lines[1],
    base: lines[1],
  };
}

function findImplicitInfo(lines: string[]): { count: number; nextIndex: number } {
  const implicitIndex = lines.findIndex((line) => line.startsWith("Implicits:"));
  if (implicitIndex === -1) {
    return { count: 0, nextIndex: 0 };
  }

  const count = Number(lines[implicitIndex].split(":")[1]?.trim() ?? "0");
  if (!Number.isFinite(count) || count <= 0) {
    return { count: 0, nextIndex: implicitIndex + 1 };
  }

  return {
    count,
    nextIndex: implicitIndex + 1,
  };
}

function isSkippableRawLine(line: string, name?: string, base?: string): boolean {
  return (
    line.startsWith("Foil Unique") ||
    line.startsWith("Rarity:") ||
    line === name ||
    line === base ||
    itemNonModLines.has(stripRawLineTags(line)) ||
    itemInfluenceLines.has(line) ||
    itemPropertyPrefixes.some((prefix) => line.startsWith(prefix)) ||
    /^Quality(?:\s*\([^)]*\))?:\s/.test(line) ||
    /^[A-Za-z]+BasePercentile:\s/.test(line)
  );
}

function stripRawLineTags(line: string): string {
  return line.replace(/\{[^}]+\}/g, "").trim();
}

function formatRawDisplayLine(line: string): string {
  const range = extractRawLineRange(line);
  const stripped = stripRawLineTags(line);
  if (!stripped) {
    return stripped;
  }

  return range === undefined ? stripped : applyRangeToDisplayLine(stripped, range, getRawDisplayRangePrecision(line));
}

function extractRawLineRange(line: string): number | undefined {
  const match = line.match(/\{range:([\d.]+)\}/);
  if (!match) {
    return undefined;
  }

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
}

function applyRangeToDisplayLine(line: string, range: number, precision: number): string {
  return line.replace(
    /(\+?)\((-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)\)/g,
    (_: string, plus: string, min: string, max: string) => {
      const resolved = roundDisplayRangeValue(Number(min) + range * (Number(max) - Number(min)), precision);
      const prefix = resolved.startsWith("-") ? "" : plus;
      return `${prefix}${resolved}`;
    },
  );
}

function roundDisplayRangeValue(value: number, precision: number): string {
  const power = 10 ** precision;
  const rounded = Math.floor(value * power + 0.5) / power;
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }

  return rounded.toString();
}

function getRawDisplayRangePrecision(line: string): number {
  return /\d+\.\d+/.test(stripRawLineTags(line)) ? 1 : 0;
}

function matchesSelectedVariant(line: string, selectedVariant?: number): boolean {
  const lineVariants = extractLineVariants(line);
  if (lineVariants.length === 0 || selectedVariant === undefined) {
    return true;
  }

  return lineVariants.includes(selectedVariant);
}

function extractLineVariants(line: string): number[] {
  const variants: number[] = [];

  for (const match of line.matchAll(/\{variant:([^}]+)\}/g)) {
    for (const part of match[1].split(",")) {
      const value = Number(part.trim());
      if (Number.isInteger(value) && value > 0) {
        variants.push(value);
      }
    }
  }

  return variants;
}

function shouldTreatRawLineAsAnoint(line: string, clean: string, inImplicitBlock: boolean): boolean {
  if (!isAnointmentText(clean)) {
    return false;
  }

  return inImplicitBlock || line.includes("{crafted}") || line.includes("{enchant}");
}

function isAnointmentText(line: string): boolean {
  return /^Allocates [A-Za-z][A-Za-z' -]+$/.test(line.replace(/^Enchant:\s*/i, "").trim());
}

interface ItemsPanelProps {
  payload: BuildPayload;
  itemSetId?: number;
  showWeaponSwap?: boolean;
  treeIndex?: number;
  onItemSetChange?: (itemSetId: number) => void;
}

export function ItemTooltip({ item }: { item: ItemPayload }) {
  const rc = (item.rarity ?? "normal").toLowerCase();
  const foulborn = isFoulbornItem(item);
  const statSections = buildStatSections(item);
  const modifierSections = buildModifierSections(item);
  const footerFlagLines = buildFooterFlagLines(item);
  const [headerLeftIcon, headerRightIcon] = buildHeaderIcons(item);
  const tooltipStyle =
    item.rarity === "Relic"
      ? ({
          ["--foil-rgb" as string]: getFoilRgb(item.foilType),
        } as React.CSSProperties)
      : undefined;

  return (
    <div className={`poe-tooltip poe-tooltip-${rc} ${foulborn ? "poe-tooltip--foulborn" : ""}`} style={tooltipStyle}>
      <div className={`poe-header ${foulborn ? "poe-header--foulborn" : ""}`}>
        <div className="poe-header-l">
          {headerLeftIcon && (
            <img
              className="poe-header-icon poe-header-icon-left"
              src={resolveInfluenceIconPath(headerLeftIcon)}
              alt=""
              loading="lazy"
              aria-hidden="true"
            />
          )}
        </div>
        <div className="poe-header-m">
          <div className="poe-name">{item.name || item.base || "Unknown Item"}</div>
          {item.name && item.base && item.base !== item.name && <div className="poe-base">{item.base}</div>}
        </div>
        <div className="poe-header-r">
          {headerRightIcon && (
            <img
              className="poe-header-icon poe-header-icon-right"
              src={resolveInfluenceIconPath(headerRightIcon)}
              alt=""
              loading="lazy"
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      {statSections.map((section) => (
        <React.Fragment key={section.key}>
          <div className="poe-sep" />
          <div className="poe-mods">
            {section.lines.map((line) => (
              <div key={line.key} className={line.className}>
                {line.iconSrc && <img className="mini-icon" src={line.iconSrc} alt="" loading="lazy" aria-hidden="true" />}
                {line.content}
              </div>
            ))}
          </div>
        </React.Fragment>
      ))}

      {modifierSections.map((section) => (
        <React.Fragment key={section.key}>
          <div className="poe-sep" />
          <div className="poe-mods">
            {section.lines.map((line) => (
              <div key={line.key} className={line.className}>
                {line.iconSrc && <img className="mini-icon" src={line.iconSrc} alt="" loading="lazy" aria-hidden="true" />}
                {line.content}
              </div>
            ))}
          </div>
        </React.Fragment>
      ))}

      {footerFlagLines.length > 0 && (
        <>
          <div className="poe-sep" />
          <div className="poe-mods">
            {footerFlagLines.map((line) => (
              <div key={line.key} className={line.className}>
                {line.content}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ItemsPanel({
  itemSetId: controlledItemSetId,
  onItemSetChange,
  payload,
  showWeaponSwap = false,
  treeIndex,
}: ItemsPanelProps) {
  const [internalItemSetId, setInternalItemSetId] = useState<number | undefined>(() => getInitialItemSetId(payload));
  const [useCompactMobileLayout, setUseCompactMobileLayout] = useState(false);
  const [activeTooltipArea, setActiveTooltipArea] = useState<string | null>(null);
  const byId = useMemo(() => new Map(payload.items.map((item) => [item.id, item])), [payload.items]);
  const itemSetId = controlledItemSetId ?? internalItemSetId;
  const activeSet = useMemo(() => getSelectedItemSet(payload, itemSetId), [itemSetId, payload]);
  const activeTree = useMemo(() => getSelectedTreeSpec(payload, treeIndex), [payload, treeIndex]);
  const slotMap = useMemo(() => {
    const next = new Map<string, ItemSlotPayload>();
    for (const slot of activeSet?.slots ?? []) {
      next.set(slot.name, slot);
    }
    return next;
  }, [activeSet]);
  const socketedJewels = useMemo(() => {
    const next: Array<{ item: ItemPayload; itemId: number; nodeId: number }> = [];
    const seenItemIds = new Set<number>();

    for (const socket of [...(activeTree?.sockets ?? [])].sort((left, right) => left.nodeId - right.nodeId)) {
      const item = byId.get(socket.itemId);
      if (!item || seenItemIds.has(item.id)) {
        continue;
      }

      seenItemIds.add(item.id);
      next.push({
        item,
        itemId: socket.itemId,
        nodeId: socket.nodeId,
      });
    }

    return next;
  }, [activeTree, byId]);
  const socketedJewelItemIds = useMemo(() => new Set(socketedJewels.map((entry) => entry.itemId)), [socketedJewels]);
  const extraSlots = useMemo(
    () =>
      (activeSet?.slots ?? []).filter(
        (slot) =>
          !equipmentSlotNames.has(slot.name) &&
          (showWeaponSwap || !isWeaponSwapSlot(slot.name)) &&
          slot.itemId > 0 &&
          byId.has(slot.itemId) &&
          !socketedJewelItemIds.has(slot.itemId),
      ),
    [activeSet, byId, showWeaponSwap, socketedJewelItemIds],
  );
  const showThirdRingSlot = useMemo(() => {
    const ringThreeSlot = slotMap.get("Ring 3");
    const hasRingThreeItem = Boolean(ringThreeSlot && ringThreeSlot.itemId > 0 && byId.has(ringThreeSlot.itemId));
    return activeTree?.secondaryAscendancyId === NAMELESS_BLOODLINE_ASCENDANCY_ID || hasRingThreeItem;
  }, [activeTree?.secondaryAscendancyId, byId, slotMap]);
  const visibleEquipmentLayout = useMemo(
    () => equipmentLayout.filter((entry) => showThirdRingSlot || entry.slotName !== "Ring 3"),
    [showThirdRingSlot],
  );

  useEffect(() => {
    if (controlledItemSetId === undefined) {
      setInternalItemSetId(getInitialItemSetId(payload));
    }
  }, [controlledItemSetId, payload]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const narrowViewport = window.matchMedia("(max-width: 1180px)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const noHover = window.matchMedia("(hover: none)");

    const updateLayoutMode = () => {
      const userAgent = window.navigator.userAgent;
      const looksMobile =
        coarsePointer.matches ||
        noHover.matches ||
        window.navigator.maxTouchPoints > 0 ||
        /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);

      setUseCompactMobileLayout(narrowViewport.matches && looksMobile);
    };

    updateLayoutMode();
    narrowViewport.addEventListener("change", updateLayoutMode);
    coarsePointer.addEventListener("change", updateLayoutMode);
    noHover.addEventListener("change", updateLayoutMode);

    return () => {
      narrowViewport.removeEventListener("change", updateLayoutMode);
      coarsePointer.removeEventListener("change", updateLayoutMode);
      noHover.removeEventListener("change", updateLayoutMode);
    };
  }, []);

  useEffect(() => {
    if (!useCompactMobileLayout) {
      setActiveTooltipArea(null);
    }
  }, [useCompactMobileLayout]);

  function handleItemSetChange(nextItemSetId: number) {
    if (controlledItemSetId === undefined) {
      setInternalItemSetId(nextItemSetId);
    }

    setActiveTooltipArea(null);
    onItemSetChange?.(nextItemSetId);
  }

  function renderItemSlot(area: string, slotName: string, item?: ItemPayload, iconKey = `${slotName}:${item?.id ?? "empty"}`) {
    const iconCandidates = item ? resolveItemIconCandidates(item, slotName) : [];
    const showIcon = Boolean(item && iconCandidates.length > 0);
    const foulborn = isFoulbornItem(item);
    const corrupted = isCorruptedItem(item) && !foulborn;
    const gridArea = getEquipmentGridArea(area);
    const interactive = useCompactMobileLayout && Boolean(item);
    const tooltipActive = interactive && activeTooltipArea === area;

    return (
      <div
        key={area}
        className={`gear-slot gear-slot--${area} ${item ? "gear-slot--occupied" : "gear-slot--empty"} ${foulborn ? "gear-slot--foulborn" : ""} ${corrupted ? "gear-slot--corrupted" : ""} ${tooltipActive ? " gear-slot--tooltip-open" : ""}`}
        style={gridArea ? { gridArea } : undefined}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-expanded={interactive ? tooltipActive : undefined}
        aria-label={interactive ? `Show ${item?.name || item?.base || slotName}` : undefined}
        onClick={
          interactive
            ? (event) => {
                event.preventDefault();
                event.stopPropagation();
                setActiveTooltipArea((current) => (current === area ? null : area));
              }
            : undefined
        }
        onKeyDown={
          interactive
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveTooltipArea((current) => (current === area ? null : area));
                }
              }
            : undefined
        }
      >
        {item && showIcon ? (
          <ResolvedItemIcon
            key={iconKey}
            alt={item.name || item.base || slotName}
            candidates={iconCandidates}
            mirrored={isDisplayMirroredItem(item)}
          />
        ) : (
          <div className="gear-slot-placeholder" />
        )}

        {item && (
          <div
            className={`gear-tooltip-panel gear-tooltip-panel--${getTooltipSide(area)}${tooltipActive ? " gear-tooltip-panel--mobile-active" : ""}`}
            onClick={(event) => event.stopPropagation()}
          >
            <ItemTooltip item={item} />
          </div>
        )}
      </div>
    );
  }

  function renderSlot(slotName: string, area: string) {
    const slot = slotMap.get(slotName);
    const item = slot ? byId.get(slot.itemId) : undefined;
    return renderItemSlot(area, slotName, item, `${slotName}:${slot?.itemId ?? "empty"}`);
  }

  return (
    <section className={`panel gear-panel${useCompactMobileLayout ? " gear-panel--mobile-compact" : ""}`}>
      {useCompactMobileLayout && activeTooltipArea && (
        <button
          aria-label="Close item details"
          className="gear-tooltip-backdrop"
          type="button"
          onClick={() => setActiveTooltipArea(null)}
        />
      )}
      <div className="panel-toolbar">
        <h2>Gear</h2>
        {payload.itemSets.length > 1 && (
          <select
            aria-label="Item Set"
            className="panel-select"
            value={activeSet?.id ?? ""}
            onChange={(event) => handleItemSetChange(Number(event.target.value))}
          >
            {payload.itemSets.map((set, index) => (
              <option key={`item-set:${set.id}`} value={set.id}>
                {getItemSetLabel(index, set.title)}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="gear-board">
        <div className={`gear-equipment-grid ${showThirdRingSlot ? "gear-equipment-grid--ring-third" : "gear-equipment-grid--standard"}`}>
          {visibleEquipmentLayout.map((entry) => renderSlot(entry.slotName, entry.area))}
        </div>

        <div className="gear-flask-row">
          {flaskSlots.map((slotName, index) => renderSlot(slotName, `flask-${index + 1}`))}
        </div>

        {socketedJewels.length > 0 && (
          <div className="gear-jewel-row">
            {socketedJewels.map((socket, index) =>
              renderItemSlot(`jewel-${index + 1}`, `Tree Jewel ${index + 1}`, socket.item, `tree-socket:${socket.nodeId}:${socket.itemId}`),
            )}
          </div>
        )}

        {extraSlots.length > 0 && (
          <div className="gear-extras-row">
            {extraSlots.map((slot, index) => renderSlot(slot.name, `extra-${index + 1}`))}
          </div>
        )}
      </div>
    </section>
  );
}
