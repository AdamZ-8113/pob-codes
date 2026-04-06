import type { ItemPayload, TreeSpecPayload } from "@pobcodes/shared-types";

import type { PassiveTreeLayoutNode } from "./passive-tree";
import {
  TIMELESS_KEYSTONE_BY_CONQUEROR_NAME,
  TIMELESS_KEYSTONES,
  type TimelessKeystoneData,
} from "./generated/passive-tree-timeless-keystones";

const MODERN_LARGE_JEWEL_RADIUS = 1800;
const LEGACY_LARGE_JEWEL_RADIUS = 1500;
const CONQUERED_PASSIVES_LINE = /^Passives in radius are Conquered by /i;
const COMMEMORATED_CONQUEROR_LINE = /^Commissioned \d+ coins to commemorate (.+)$/i;
const TIMELESS_CONQUEROR_NAME_PATTERNS = Object.keys(TIMELESS_KEYSTONE_BY_CONQUEROR_NAME).map((name) => ({
  name,
  pattern: new RegExp(`\\b${escapeRegExp(name)}\\b`, "i"),
}));

export interface TimelessKeystoneTransformation {
  icon?: string;
  lines: string[];
  name: string;
}

export function resolveTimelessKeystoneTransformations(
  spec: TreeSpecPayload,
  layoutNodeIndex: ReadonlyMap<number, PassiveTreeLayoutNode>,
  itemsById: ReadonlyMap<number, ItemPayload>,
): ReadonlyMap<number, TimelessKeystoneTransformation> {
  const keystoneNodes = spec.nodes
    .map((nodeId) => layoutNodeIndex.get(nodeId))
    .filter((node): node is PassiveTreeLayoutNode => Boolean(node?.isKeystone));

  if (keystoneNodes.length === 0 || spec.sockets.length === 0) {
    return new Map();
  }

  const transformations = new Map<number, TimelessKeystoneTransformation>();
  const radius = resolveTimelessJewelLargeRadius(spec.version);
  const radiusSquared = radius * radius;

  for (const socket of spec.sockets) {
    const item = itemsById.get(socket.itemId);
    const keystone = item ? resolveTimelessKeystoneFromItem(item) : undefined;
    if (!keystone) {
      continue;
    }

    const socketNode = layoutNodeIndex.get(socket.nodeId);
    if (!socketNode) {
      continue;
    }

    for (const node of keystoneNodes) {
      const deltaX = node.x - socketNode.x;
      const deltaY = node.y - socketNode.y;
      const distanceSquared = deltaX * deltaX + deltaY * deltaY;
      if (distanceSquared > radiusSquared) {
        continue;
      }

      transformations.set(node.id, {
        icon: keystone.icon,
        lines: [...keystone.lines],
        name: keystone.name,
      });
    }
  }

  return transformations;
}

function resolveTimelessKeystoneFromItem(item: ItemPayload): TimelessKeystoneData | undefined {
  const commemoratedName = parseTimelessCommemoratedName(item.raw);
  if (!commemoratedName) {
    return undefined;
  }

  const keystoneId = TIMELESS_KEYSTONE_BY_CONQUEROR_NAME[commemoratedName.toLowerCase()];
  if (!keystoneId) {
    return undefined;
  }

  return TIMELESS_KEYSTONES[keystoneId];
}

function parseTimelessCommemoratedName(raw: string): string | undefined {
  const lines = raw.split(/\r?\n/).map((line) => line.trim());
  if (!lines.some((line) => CONQUERED_PASSIVES_LINE.test(line))) {
    return undefined;
  }

  for (const line of lines) {
    const match = COMMEMORATED_CONQUEROR_LINE.exec(line);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  for (const line of lines) {
    for (const entry of TIMELESS_CONQUEROR_NAME_PATTERNS) {
      if (entry.pattern.test(line)) {
        return entry.name;
      }
    }
  }

  return undefined;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function resolveTimelessJewelLargeRadius(version?: string) {
  const match = version?.match(/^(\d+)\.(\d+)$/);
  if (!match) {
    return MODERN_LARGE_JEWEL_RADIUS;
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  if (!Number.isFinite(major) || !Number.isFinite(minor)) {
    return MODERN_LARGE_JEWEL_RADIUS;
  }

  if (major < 3 || (major === 3 && minor <= 15)) {
    return LEGACY_LARGE_JEWEL_RADIUS;
  }

  return MODERN_LARGE_JEWEL_RADIUS;
}
