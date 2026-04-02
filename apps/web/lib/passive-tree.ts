import type { ItemJewelRadius, ItemPayload, TreeSpecPayload } from "@pobcodes/shared-types";

import { GENERATED_PASSIVE_TREE_CLUSTER_DATA } from "./generated/passive-tree-cluster-data";

export const PASSIVE_TREE_VARIANT_ORDER = ["default", "alternate", "ruthless", "ruthlessAlternate"] as const;
export const PASSIVE_TREE_VIEW_PADDING = 1000;
export const PASSIVE_TREE_MIN_ZOOM = 0.25;
export const PASSIVE_TREE_MAX_ZOOM = 5;

const MIN_FOCUS_SPAN = 2400;
const PASSIVE_TREE_ORBIT_RADII = [0, 82, 162, 335, 493, 662, 846] as const;
const PASSIVE_TREE_SKILLS_PER_ORBIT = [1, 6, 16, 16, 40, 72, 72] as const;
const PRIMARY_ASCENDANCY_TARGET_X_FACTOR = 0.88;
const SECONDARY_ASCENDANCY_TARGET_X_FACTOR = 0.82;
const ASCENDANCY_TARGET_Y_FACTOR = 0.42;
const CLUSTER_JEWEL_SOCKET_NAMES = new Set(["Large Jewel Socket", "Medium Jewel Socket", "Small Jewel Socket"]);
const CLUSTER_JEWEL_BASE_ID = 0x10000;
const CLUSTER_LARGE_SOCKET_ORDER = [0, 2, 1] as const;
const CLUSTER_SMALL_PASSIVE_GRANT_PREFIX = "Added Small Passive Skills grant: ";
const CLUSTER_SMALL_PASSIVE_ALSO_GRANT_PREFIX = "Added Small Passive Skills also grant: ";
const PASSIVE_JEWEL_RADIUS_VALUES: Record<ItemJewelRadius, number> = {
  large: 1800,
  massive: 2880,
  medium: 1440,
  small: 960,
  veryLarge: 2400,
};
const PASSIVE_TREE_CLUSTER_VARIANTS = GENERATED_PASSIVE_TREE_CLUSTER_DATA.variants as Record<
  string,
  PassiveTreeClusterVariantMeta
>;
const PASSIVE_TREE_CLUSTER_TEMPLATES = GENERATED_PASSIVE_TREE_CLUSTER_DATA.templates as Record<
  keyof typeof GENERATED_PASSIVE_TREE_CLUSTER_DATA.templates,
  PassiveTreeClusterTemplateMeta
>;
const PASSIVE_TREE_CLUSTER_BASE_NODES = GENERATED_PASSIVE_TREE_CLUSTER_DATA.baseNodesByName as Record<
  string,
  PassiveTreeClusterBaseNodeMeta
>;
const PASSIVE_TREE_CLUSTER_NOTABLE_SORT_ORDER = GENERATED_PASSIVE_TREE_CLUSTER_DATA.notableSortOrder as Record<
  string,
  number
>;
const SECONDARY_ASCENDANCY_NAMES = new Set([
  "Aul Bloodline",
  "Breachlord",
  "Catarina Bloodline",
  "Chaos Bloodline",
  "Delirious",
  "Farrul Bloodline",
  "Lycia Bloodline",
  "Nameless Bloodline",
  "Necromantic",
  "Olroth Bloodline",
  "Oshabi Bloodline",
  "Scavenger",
  "Warlock of the Mists",
  "Warden of the Maji",
  "Wildwood Primalist",
]);
const nodeIdSetCache = new WeakMap<number[], Set<number>>();

export type PassiveTreeVariantKey = (typeof PASSIVE_TREE_VARIANT_ORDER)[number];
export type PassiveTreeNodeKind = "class-start" | "mastery" | "keystone" | "notable" | "jewel-socket" | "passive";

export interface PassiveTreeBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface PassiveTreeMasteryEffect {
  effect: number;
  stats: string[];
  reminderText: string[];
}

export interface PassiveTreeLayoutGroup {
  id: number;
  x: number;
  y: number;
  backgroundSpriteKey?: string;
  backgroundSpriteMirrorY?: boolean;
}

export interface PassiveTreeLayoutNode {
  activeIcon?: string;
  id: number;
  icon?: string;
  inactiveIcon?: string;
  name: string;
  x: number;
  y: number;
  stats: string[];
  reminderText: string[];
  flavourText: string[];
  out: number[];
  groupId: number;
  groupCenterX?: number;
  groupCenterY?: number;
  orbit: number;
  orbitIndex: number;
  orbitRadius?: number;
  classStartIndex?: number;
  isAscendancyStart?: boolean;
  isJewelSocket: boolean;
  isKeystone: boolean;
  isMastery: boolean;
  isNotable: boolean;
  masteryEffects: PassiveTreeMasteryEffect[];
  startArt?: string;
}

export interface PassiveTreeLayout {
  bounds: PassiveTreeBounds;
  groups: PassiveTreeLayoutGroup[];
  nodes: PassiveTreeLayoutNode[];
  unpositionedNodeIds: number[];
}

interface PassiveTreeClusterExpansionMeta {
  index: number;
  parent?: number;
  proxy: number;
  size: number;
}

interface PassiveTreeClusterNodeMeta {
  expansionJewel?: PassiveTreeClusterExpansionMeta;
  groupId: number;
  in: readonly number[];
  isProxy: boolean;
  name: string;
  orbit: number;
  orbitIndex: number;
  out: readonly number[];
}

interface PassiveTreeClusterBaseNodeMeta {
  flavourText: readonly string[];
  icon?: string;
  isKeystone: boolean;
  isNotable: boolean;
  reminderText: readonly string[];
  stats: readonly string[];
}

interface ParsedClusterJewel {
  addedSmallPassiveLines: string[];
  nodeCount: number;
  notableNames: string[];
  sizeName: keyof typeof GENERATED_PASSIVE_TREE_CLUSTER_DATA.templates;
  smallPassiveLines: string[];
  socketCount: number;
}

type PassiveTreeClusterVariantMeta = {
  nodesById: Record<string, PassiveTreeClusterNodeMeta>;
};

type PassiveTreeClusterTemplateMeta = {
  maxNodes: number;
  minNodes: number;
  notableIndices: readonly number[];
  size: string;
  sizeIndex: number;
  smallIndices: readonly number[];
  socketIndices: readonly number[];
  totalIndices: number;
};

export interface PassiveTreeManifestVariant {
  bounds: PassiveTreeBounds;
  classCount: number;
  groupCount: number;
  layoutPath: string;
  nodeCount: number;
  nodeIds: readonly number[];
  positionedNodeCount: number;
  publicAssetRoot: string;
  sourceFile: string;
  treeName: string;
  unpositionedNodeCount: number;
}

export interface PassiveTreeManifest {
  passiveTreeAssetRoot: string;
  spriteManifestPath?: string;
  variants: Readonly<Record<string, PassiveTreeManifestVariant>>;
}

export interface PassiveTreeSpriteEntry {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PassiveTreeSpriteAtlas {
  coords: Record<string, PassiveTreeSpriteEntry>;
  imagePath?: string;
  size: {
    width: number;
    height: number;
  };
}

export interface PassiveTreeSpriteManifest {
  atlases: Record<string, PassiveTreeSpriteAtlas>;
}

export interface PassiveTreeResolvedSprite {
  atlas: PassiveTreeSpriteAtlas;
  entry: PassiveTreeSpriteEntry;
}

export interface PassiveTreeViewBounds extends PassiveTreeBounds {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface PassiveTreeViewport {
  zoom: number;
  panX: number;
  panY: number;
}

export interface PassiveTreeViewBox extends PassiveTreeViewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PassiveTreeNodeDescription {
  title: string;
  kind: string;
  lines: string[];
  reminderText: string[];
  flavourText: string[];
  overridden: boolean;
}

export interface PassiveTreeLink {
  sourceId: number;
  targetId: number;
}

export interface PassiveTreeJewelRadiusOverlay {
  itemId: number;
  nodeId: number;
  radius: number;
  x: number;
  y: number;
}

export function augmentPassiveTreeLayoutWithClusters(
  layout: PassiveTreeLayout,
  spec: TreeSpecPayload,
  itemsById?: ReadonlyMap<number, ItemPayload>,
  variantKey?: string,
): PassiveTreeLayout {
  if (!itemsById || spec.sockets.length === 0) {
    return layout;
  }

  const variant = PASSIVE_TREE_CLUSTER_VARIANTS[variantKey ?? "default"] ?? PASSIVE_TREE_CLUSTER_VARIANTS.default;
  const rootClusterSockets = spec.sockets.filter((socket) => {
    const item = itemsById.get(socket.itemId);
    const socketMeta = getClusterMetaNode(variant, socket.nodeId);
    return (
      item &&
      isClusterJewelItem(item) &&
      socketMeta?.expansionJewel &&
      socketMeta.expansionJewel.parent === undefined
    );
  });

  if (rootClusterSockets.length === 0) {
    return layout;
  }

  const originalNodeIndex = new Map(layout.nodes.map((node) => [node.id, node]));
  const mutableNodeIndex = new Map<number, PassiveTreeLayoutNode>();
  const addedNodes: PassiveTreeLayoutNode[] = [];

  const ensureMutableNode = (nodeId: number) => {
    const existing = mutableNodeIndex.get(nodeId);
    if (existing) {
      return existing;
    }

    const original = originalNodeIndex.get(nodeId);
    if (!original) {
      return undefined;
    }

    const clone = {
      ...original,
      out: [...original.out],
    };
    mutableNodeIndex.set(nodeId, clone);
    return clone;
  };

  const disconnectNode = (nodeId: number) => {
    const node = ensureMutableNode(nodeId);
    if (node) {
      node.out = [];
    }
  };

  const addBidirectionalLink = (leftId: number, rightId: number) => {
    const left = ensureMutableNode(leftId);
    const right = ensureMutableNode(rightId);
    if (!left || !right) {
      return;
    }

    if (!left.out.includes(rightId)) {
      left.out = [...left.out, rightId];
    }
    if (!right.out.includes(leftId)) {
      right.out = [...right.out, leftId];
    }
  };

  const addDynamicNode = (node: PassiveTreeLayoutNode) => {
    mutableNodeIndex.set(node.id, node);
    addedNodes.push(node);
    return node;
  };

  const buildSubgraph = (socketNodeId: number, item: ItemPayload, clusterBaseId = CLUSTER_JEWEL_BASE_ID) => {
    const socketMeta = getClusterMetaNode(variant, socketNodeId);
    const socketNode = ensureMutableNode(socketNodeId);
    if (!socketMeta?.expansionJewel || !socketNode) {
      return;
    }

    const parsedClusterJewel = parseClusterJewel(item);
    if (!parsedClusterJewel) {
      return;
    }

    const clusterTemplate = PASSIVE_TREE_CLUSTER_TEMPLATES[parsedClusterJewel.sizeName];
    if (!clusterTemplate) {
      return;
    }

    let subgraphBaseId = clusterBaseId;
    if (socketMeta.expansionJewel.size === 2) {
      subgraphBaseId += socketMeta.expansionJewel.index << 6;
    } else if (socketMeta.expansionJewel.size === 1) {
      subgraphBaseId += socketMeta.expansionJewel.index << 9;
    }

    const clusterNodeBaseId = subgraphBaseId + (clusterTemplate.sizeIndex << 4);
    const proxyNodeMeta = getClusterMetaNode(variant, socketMeta.expansionJewel.proxy);
    const proxyNode = ensureMutableNode(socketMeta.expansionJewel.proxy);
    if (!proxyNodeMeta || !proxyNode) {
      return;
    }

    disconnectNode(proxyNode.id);
    disconnectNode(socketNode.id);

    const nodeOrbit = clusterTemplate.sizeIndex + 1;
    const groupCenterX = proxyNode.groupCenterX ?? proxyNode.x;
    const groupCenterY = proxyNode.groupCenterY ?? proxyNode.y;
    const orbitRadius = PASSIVE_TREE_ORBIT_RADII[nodeOrbit] ?? proxyNode.orbitRadius ?? 0;
    const indicies = new Map<number, PassiveTreeLayoutNode>();

    const createDynamicNode = (
      nodeIndex: number,
      overrides: Partial<PassiveTreeLayoutNode> & Pick<PassiveTreeLayoutNode, "id" | "name">,
    ) => {
      const correctedOrbitIndex = getClusterCorrectedOrbitIndex(nodeIndex, clusterTemplate.totalIndices, proxyNode);
      return addDynamicNode({
        flavourText: overrides.flavourText ?? [],
        groupCenterX,
        groupCenterY,
        groupId: proxyNode.groupId,
        icon: overrides.icon,
        id: overrides.id,
        inactiveIcon: overrides.inactiveIcon,
        isAscendancyStart: false,
        isJewelSocket: overrides.isJewelSocket ?? false,
        isKeystone: overrides.isKeystone ?? false,
        isMastery: overrides.isMastery ?? false,
        isNotable: overrides.isNotable ?? false,
        masteryEffects: [],
        name: overrides.name,
        orbit: nodeOrbit,
        orbitIndex: correctedOrbitIndex,
        orbitRadius,
        out: [],
        reminderText: overrides.reminderText ?? [],
        stats: overrides.stats ?? [],
        x: roundCoordinate(groupCenterX + Math.sin(getPassiveTreeOrbitAngle(nodeOrbit, correctedOrbitIndex)) * orbitRadius),
        y: roundCoordinate(groupCenterY - Math.cos(getPassiveTreeOrbitAngle(nodeOrbit, correctedOrbitIndex)) * orbitRadius),
      });
    };

    const findSocketNodeId = (expansionIndex: number) =>
      findClusterSocketNodeId(variant, proxyNode.groupId, expansionIndex, socketNode.id);

    const makeSocket = (nodeIndex: number, socketIndex: number) => {
      const childSocketNodeId = findSocketNodeId(socketIndex);
      if (!childSocketNodeId) {
        return;
      }
      disconnectNode(childSocketNodeId);
      const childSocketNode = ensureMutableNode(childSocketNodeId);
      if (!childSocketNode) {
        return;
      }
      indicies.set(nodeIndex, childSocketNode);
    };

    if (parsedClusterJewel.socketCount > 0) {
      if (parsedClusterJewel.sizeName === "Large Cluster Jewel" && parsedClusterJewel.socketCount === 1) {
        makeSocket(6, 1);
      } else {
        for (
          let index = 0;
          index < parsedClusterJewel.socketCount && index < clusterTemplate.socketIndices.length;
          index += 1
        ) {
          makeSocket(clusterTemplate.socketIndices[index], CLUSTER_LARGE_SOCKET_ORDER[index] ?? index);
        }
      }
    }

    const notableNames = [...parsedClusterJewel.notableNames].sort(compareClusterNotables);
    const notableIndexList = gatherClusterNotableIndices(clusterTemplate, parsedClusterJewel, indicies);
    for (let index = 0; index < notableNames.length && index < notableIndexList.length; index += 1) {
      const notableName = notableNames[index];
      const baseNode = PASSIVE_TREE_CLUSTER_BASE_NODES[notableName];
      const nodeIndex = notableIndexList[index];
      indicies.set(
        nodeIndex,
        createDynamicNode(nodeIndex, {
          flavourText: [...(baseNode?.flavourText ?? [])],
          icon: baseNode?.icon,
          id: clusterNodeBaseId + nodeIndex,
          isKeystone: baseNode?.isKeystone ?? false,
          isNotable: true,
          name: notableName,
          reminderText: [...(baseNode?.reminderText ?? [])],
          stats: [...(baseNode?.stats ?? [])],
        }),
      );
    }

    const smallIndexList = gatherClusterSmallIndices(clusterTemplate, parsedClusterJewel, indicies);
    const smallPassiveStats = [...parsedClusterJewel.smallPassiveLines, ...parsedClusterJewel.addedSmallPassiveLines];
    for (let index = 0; index < smallIndexList.length; index += 1) {
      const nodeIndex = smallIndexList[index];
      indicies.set(
        nodeIndex,
        createDynamicNode(nodeIndex, {
          id: clusterNodeBaseId + nodeIndex,
          name: "Small Passive",
          stats: smallPassiveStats,
        }),
      );
    }

    const entranceNode = indicies.get(0);
    if (!entranceNode) {
      return;
    }

    const orderedNodes = Array.from(indicies.entries())
      .sort(([left], [right]) => left - right)
      .map(([, node]) => node);

    let previousNode: PassiveTreeLayoutNode | undefined;
    for (const node of orderedNodes) {
      if (previousNode) {
        addBidirectionalLink(previousNode.id, node.id);
      }
      previousNode = node;
    }

    if (orderedNodes.length > 1 && parsedClusterJewel.sizeName !== "Small Cluster Jewel") {
      addBidirectionalLink(orderedNodes[0].id, orderedNodes[orderedNodes.length - 1].id);
    }
    addBidirectionalLink(socketNode.id, entranceNode.id);

    for (const node of orderedNodes) {
      if (!node.isJewelSocket) {
        continue;
      }

      const childSocket = spec.sockets.find((socket) => socket.nodeId === node.id);
      if (!childSocket) {
        continue;
      }

      const childItem = itemsById.get(childSocket.itemId);
      if (childItem && isClusterJewelItem(childItem)) {
        buildSubgraph(node.id, childItem, subgraphBaseId);
      }
    }
  };

  for (const rootSocket of rootClusterSockets) {
    const item = itemsById.get(rootSocket.itemId);
    if (item) {
      buildSubgraph(rootSocket.nodeId, item);
    }
  }

  if (addedNodes.length === 0 && mutableNodeIndex.size === 0) {
    return layout;
  }

  const mergedNodes = layout.nodes.map((node) => mutableNodeIndex.get(node.id) ?? node).concat(addedNodes);
  mergedNodes.sort((left, right) => left.id - right.id);

  return {
    ...layout,
    nodes: mergedNodes,
  };
}

export function getVisiblePassiveTreeNodeIds(
  nodes: PassiveTreeLayoutNode[],
  spec: TreeSpecPayload,
  itemsById?: ReadonlyMap<number, ItemPayload>,
): Set<number> {
  if (nodes.length === 0) {
    return new Set<number>();
  }

  const nodeIndex = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = buildPassiveTreeAdjacency(nodes);

  const occupiedSocketNodeIds = new Set(spec.sockets.map((socket) => socket.nodeId));
  const occupiedClusterSocketNodeIds = new Set(
    spec.sockets
      .filter((socket) => {
        const item = itemsById?.get(socket.itemId);
        return item ? isClusterJewelItem(item) : true;
      })
      .map((socket) => socket.nodeId),
  );

  const rootNodeIds = nodes
    .filter((node) => node.classStartIndex !== undefined || node.isAscendancyStart === true)
    .map((node) => node.id);

  if (rootNodeIds.length === 0) {
    return new Set(nodes.map((node) => node.id));
  }

  const rootNodeIdSet = new Set(rootNodeIds);
  const seedNodeIds = new Set<number>([
    ...spec.nodes.filter((nodeId) => nodeIndex.has(nodeId)),
    ...spec.sockets.map((socket) => socket.nodeId).filter((nodeId) => nodeIndex.has(nodeId)),
  ]);
  const expansionNeighborNodeIdsBySocket = new Map<number, Set<number>>();
  for (const node of nodes) {
    if (!node.isJewelSocket) {
      continue;
    }

    const expansionNeighborNodeIds = new Set<number>();
    for (const neighborId of adjacency.get(node.id) ?? []) {
      if (!canReachPassiveTreeRootsWithoutNode(neighborId, node.id, adjacency, rootNodeIdSet)) {
        expansionNeighborNodeIds.add(neighborId);
      }
    }

    expansionNeighborNodeIdsBySocket.set(node.id, expansionNeighborNodeIds);
  }

  const visibleNodeIds = new Set<number>();
  const queue = [...(seedNodeIds.size > 0 ? seedNodeIds : rootNodeIdSet)];

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (nodeId === undefined || visibleNodeIds.has(nodeId)) {
      continue;
    }

    visibleNodeIds.add(nodeId);
    const node = nodeIndex.get(nodeId);
    if (!node) {
      continue;
    }

    const expansionNeighborNodeIds = expansionNeighborNodeIdsBySocket.get(node.id) ?? new Set<number>();
    const allowExpansion =
      isClusterExpansionSocket(node)
        ? occupiedClusterSocketNodeIds.has(node.id)
        : node.isJewelSocket
          ? occupiedSocketNodeIds.has(node.id)
          : true;

    for (const neighborId of adjacency.get(node.id) ?? []) {
      if (expansionNeighborNodeIds.has(neighborId) && !allowExpansion) {
        continue;
      }

      if (!visibleNodeIds.has(neighborId)) {
        queue.push(neighborId);
      }
    }
  }

  return visibleNodeIds;
}

export function buildPassiveTreeJewelRadiusOverlays(
  layout: PassiveTreeLayout,
  spec: TreeSpecPayload,
  itemsById?: ReadonlyMap<number, ItemPayload>,
): PassiveTreeJewelRadiusOverlay[] {
  if (!itemsById || spec.sockets.length === 0) {
    return [];
  }

  const nodeIndex = new Map(layout.nodes.map((node) => [node.id, node]));
  const overlays: PassiveTreeJewelRadiusOverlay[] = [];

  for (const socket of spec.sockets) {
    const item = itemsById.get(socket.itemId);
    const node = nodeIndex.get(socket.nodeId);
    const jewelRadius = item ? resolvePassiveJewelRadius(item) : undefined;

    if (!item || !node || !jewelRadius) {
      continue;
    }

    overlays.push({
      itemId: item.id,
      nodeId: node.id,
      radius: PASSIVE_JEWEL_RADIUS_VALUES[jewelRadius],
      x: node.x,
      y: node.y,
    });
  }

  return overlays;
}

export function pickPassiveTreeVariant(
  spec: TreeSpecPayload | undefined,
  manifest: PassiveTreeManifest,
): string | undefined {
  const orderedKeys = getOrderedVariantKeys(manifest);
  if (orderedKeys.length === 0) {
    return undefined;
  }

  if (!spec || spec.nodes.length === 0) {
    return orderedKeys[0];
  }

  let bestKey: string | undefined;
  let bestScore = -1;

  for (const key of orderedKeys) {
    const variant = manifest.variants[key];
    if (!variant) {
      continue;
    }

    const nodeIds = getNodeIdSet(variant.nodeIds);
    let score = 0;
    for (const nodeId of spec.nodes) {
      if (nodeIds.has(nodeId)) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestKey = key;
      bestScore = score;
    }
  }

  return bestScore > 0 ? bestKey : undefined;
}

export function getPassiveTreeViewBounds(bounds: PassiveTreeBounds, padding = PASSIVE_TREE_VIEW_PADDING): PassiveTreeViewBounds {
  const minX = bounds.minX - padding;
  const minY = bounds.minY - padding;
  const maxX = bounds.maxX + padding;
  const maxY = bounds.maxY + padding;

  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    height: maxY - minY,
    maxX,
    maxY,
    minX,
    minY,
    width: maxX - minX,
  };
}

export function getPassiveTreeDisplayLayout(
  layout: PassiveTreeLayout,
  visibleNodeIds?: Set<number>,
): PassiveTreeLayout {
  if (!visibleNodeIds || visibleNodeIds.size === 0) {
    return layout;
  }

  const nodeIndex = new Map(layout.nodes.map((node) => [node.id, node]));
  const adjacency = new Map<number, Set<number>>();
  for (const nodeId of visibleNodeIds) {
    adjacency.set(nodeId, new Set<number>());
  }

  for (const link of buildPassiveTreeLinks(layout.nodes, visibleNodeIds)) {
    adjacency.get(link.sourceId)?.add(link.targetId);
    adjacency.get(link.targetId)?.add(link.sourceId);
  }

  const regionOffsets = new Map<number, { dx: number; dy: number }>();
  const visitedNodeIds = new Set<number>();
  const anchorTargets = getAscendancyAnchorTargets(layout);

  for (const startNode of layout.nodes) {
    if (!startNode.isAscendancyStart || !visibleNodeIds.has(startNode.id) || visitedNodeIds.has(startNode.id)) {
      continue;
    }

    const regionNodeIds: number[] = [];
    const queue = [startNode.id];

    while (queue.length > 0) {
      const nodeId = queue.shift();
      if (nodeId === undefined || visitedNodeIds.has(nodeId)) {
        continue;
      }

      visitedNodeIds.add(nodeId);
      regionNodeIds.push(nodeId);

      for (const neighborId of adjacency.get(nodeId) ?? []) {
        if (!visitedNodeIds.has(neighborId)) {
          queue.push(neighborId);
        }
      }
    }

    const target = isSecondaryAscendancyName(startNode.name) ? anchorTargets.secondary : anchorTargets.primary;
    const targetX = target.x;
    const targetY = target.y;
    const dx = targetX - startNode.x;
    const dy = targetY - startNode.y;

    for (const nodeId of regionNodeIds) {
      regionOffsets.set(nodeId, { dx, dy });
    }
  }

  if (regionOffsets.size === 0) {
    return layout;
  }

  return {
    ...layout,
    nodes: layout.nodes.map((node) => {
      const offset = regionOffsets.get(node.id);
      if (!offset) {
        return node;
      }

      return {
        ...node,
        groupCenterX: node.groupCenterX !== undefined ? node.groupCenterX + offset.dx : undefined,
        groupCenterY: node.groupCenterY !== undefined ? node.groupCenterY + offset.dy : undefined,
        x: node.x + offset.dx,
        y: node.y + offset.dy,
      };
    }),
  };
}

export function getPassiveTreeInitialViewport(
  layout: PassiveTreeLayout,
  allocatedNodeIds: number[],
  viewBounds = getPassiveTreeViewBounds(layout.bounds),
): PassiveTreeViewport {
  const allocated = new Set(allocatedNodeIds);
  const focusNodes = layout.nodes.filter((node) => allocated.has(node.id));

  if (focusNodes.length === 0) {
    return {
      panX: 0,
      panY: 0,
      zoom: 1,
    };
  }

  const focusBounds = getNodeBounds(focusNodes);
  const targetWidth = Math.max(focusBounds.maxX - focusBounds.minX + 900, MIN_FOCUS_SPAN);
  const targetHeight = Math.max(focusBounds.maxY - focusBounds.minY + 900, MIN_FOCUS_SPAN);
  const zoom = clamp(
    Math.min(viewBounds.width / targetWidth, viewBounds.height / targetHeight),
    PASSIVE_TREE_MIN_ZOOM,
    PASSIVE_TREE_MAX_ZOOM,
  );
  const pan = clampPassiveTreePan(viewBounds, zoom, focusBounds.centerX - viewBounds.centerX, focusBounds.centerY - viewBounds.centerY);

  return {
    panX: pan.panX,
    panY: pan.panY,
    zoom,
  };
}

export function getPassiveTreeCenteredViewport(
  layout: PassiveTreeLayout,
  centeredNodeIds: Iterable<number> | undefined,
  zoom: number,
  viewBounds = getPassiveTreeViewBounds(layout.bounds),
): PassiveTreeViewport {
  const centeredNodeIdSet = centeredNodeIds ? new Set(centeredNodeIds) : undefined;
  const focusNodes =
    centeredNodeIdSet && centeredNodeIdSet.size > 0
      ? layout.nodes.filter((node) => centeredNodeIdSet.has(node.id))
      : layout.nodes;
  const boundedFocusNodes = focusNodes.length > 0 ? focusNodes : layout.nodes;
  const focusBounds = getRenderedContentBounds(layout.nodes, boundedFocusNodes, centeredNodeIdSet);
  const clampedZoom = clamp(zoom, PASSIVE_TREE_MIN_ZOOM, PASSIVE_TREE_MAX_ZOOM);
  const pan = clampPassiveTreePan(
    viewBounds,
    clampedZoom,
    focusBounds.centerX - viewBounds.centerX,
    focusBounds.centerY - viewBounds.centerY,
  );

  return {
    panX: pan.panX,
    panY: pan.panY,
    zoom: clampedZoom,
  };
}

export function buildPassiveTreeViewBox(
  viewBounds: PassiveTreeViewBounds,
  viewport: PassiveTreeViewport,
): PassiveTreeViewBox {
  const zoom = clamp(viewport.zoom, PASSIVE_TREE_MIN_ZOOM, PASSIVE_TREE_MAX_ZOOM);
  const pan = clampPassiveTreePan(viewBounds, zoom, viewport.panX, viewport.panY);
  const width = viewBounds.width / zoom;
  const height = viewBounds.height / zoom;

  return {
    height,
    panX: pan.panX,
    panY: pan.panY,
    width,
    x: viewBounds.centerX - width / 2 + pan.panX,
    y: viewBounds.centerY - height / 2 + pan.panY,
    zoom,
  };
}

export function clampPassiveTreePan(
  viewBounds: PassiveTreeViewBounds,
  zoom: number,
  panX: number,
  panY: number,
): Pick<PassiveTreeViewport, "panX" | "panY"> {
  const clampedZoom = clamp(zoom, PASSIVE_TREE_MIN_ZOOM, PASSIVE_TREE_MAX_ZOOM);
  const maxPanX = Math.max(0, (viewBounds.width - viewBounds.width / clampedZoom) / 2);
  const maxPanY = Math.max(0, (viewBounds.height - viewBounds.height / clampedZoom) / 2);

  return {
    panX: clamp(panX, -maxPanX, maxPanX),
    panY: clamp(panY, -maxPanY, maxPanY),
  };
}

export function buildPassiveTreeLinks(nodes: PassiveTreeLayoutNode[], filterNodeIds?: Set<number>) {
  const existingNodeIds = new Set(nodes.map((node) => node.id));
  const nodeIndex = new Map(nodes.map((node) => [node.id, node]));
  const ascendancyRegionNodeIds = getAscendancyRegionNodeIds(nodes, nodeIndex);
  const seen = new Set<string>();
  const links: PassiveTreeLink[] = [];

  for (const node of nodes) {
    if (filterNodeIds && !filterNodeIds.has(node.id)) {
      continue;
    }

    for (const targetId of node.out) {
      const targetNode = nodeIndex.get(targetId);
      if ((filterNodeIds && !filterNodeIds.has(targetId)) || !existingNodeIds.has(targetId) || !targetNode) {
        continue;
      }

      if (node.isMastery || targetNode.isMastery) {
        continue;
      }

      if (
        isAscendancyBoundaryEdge(node.id, targetId, ascendancyRegionNodeIds) ||
        isScionStartScaffoldEdge(node, targetNode) ||
        isAscendantClassPathBridgeEdge(node, targetNode)
      ) {
        continue;
      }

      const left = Math.min(node.id, targetId);
      const right = Math.max(node.id, targetId);
      const key = `${left}:${right}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      links.push({ sourceId: left, targetId: right });
    }
  }

  return links;
}

export function buildAllocatedPassiveTreeLinks(
  nodes: PassiveTreeLayoutNode[],
  allocatedNodeIds: Set<number>,
  filterNodeIds?: Set<number>,
) {
  const visibleLinks = buildPassiveTreeLinks(nodes, filterNodeIds);
  const nodeIndex = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map<number, Set<number>>();
  const seen = new Set<string>();
  const highlighted: PassiveTreeLink[] = [];

  for (const link of visibleLinks) {
    if (!adjacency.has(link.sourceId)) {
      adjacency.set(link.sourceId, new Set());
    }
    if (!adjacency.has(link.targetId)) {
      adjacency.set(link.targetId, new Set());
    }
    adjacency.get(link.sourceId)?.add(link.targetId);
    adjacency.get(link.targetId)?.add(link.sourceId);
  }

  const pushEdge = (leftId: number, rightId: number) => {
    const sourceId = Math.min(leftId, rightId);
    const targetId = Math.max(leftId, rightId);
    const key = `${sourceId}:${targetId}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    highlighted.push({ sourceId, targetId });
  };

  for (const startId of allocatedNodeIds) {
    if ((filterNodeIds && !filterNodeIds.has(startId)) || !nodeIndex.has(startId)) {
      continue;
    }

    const queue: Array<{ nodeId: number; path: number[] }> = [{ nodeId: startId, path: [startId] }];
    const visitedProxyNodeIds = new Set<number>();

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }

      for (const neighborId of adjacency.get(current.nodeId) ?? []) {
        if (neighborId === startId && current.path.length > 1) {
          continue;
        }

        if (allocatedNodeIds.has(neighborId)) {
          const fullPath = [...current.path, neighborId];
          if (fullPath.length >= 2) {
            for (let index = 0; index < fullPath.length - 1; index += 1) {
              pushEdge(fullPath[index], fullPath[index + 1]);
            }
          }
          continue;
        }

        const neighbor = nodeIndex.get(neighborId);
        if (!neighbor || !isPassiveTreeProxyNode(neighbor) || visitedProxyNodeIds.has(neighborId)) {
          continue;
        }

        visitedProxyNodeIds.add(neighborId);
        queue.push({
          nodeId: neighborId,
          path: [...current.path, neighborId],
        });
      }
    }
  }

  return highlighted;
}

export function getPassiveTreeLinkPath(source: PassiveTreeLayoutNode, target: PassiveTreeLayoutNode): string {
  if (shouldUseOrbitArc(source, target)) {
    return buildOrbitArcPath(source, target);
  }

  return buildLinePath(source, target);
}

export function getPassiveTreeNodeKind(node: PassiveTreeLayoutNode): PassiveTreeNodeKind {
  if (node.classStartIndex !== undefined) return "class-start";
  if (node.isMastery) return "mastery";
  if (node.isKeystone) return "keystone";
  if (node.isNotable) return "notable";
  if (node.isJewelSocket) return "jewel-socket";
  return "passive";
}

export function getPassiveTreeNodeRadius(node: PassiveTreeLayoutNode): number {
  switch (getPassiveTreeNodeKind(node)) {
    case "class-start":
      return 68;
    case "keystone":
      return 58;
    case "mastery":
      return 40;
    case "notable":
      return 40;
    case "jewel-socket":
      return 44;
    default:
      return 32;
  }
}

export function describePassiveTreeNode(
  node: PassiveTreeLayoutNode,
  spec: TreeSpecPayload,
): PassiveTreeNodeDescription {
  const override = spec.overrides.find((entry) => entry.nodeId === node.id);
  if (override) {
    return {
      flavourText: [],
      kind: `${getPassiveTreeNodeKindLabel(node)} Override`,
      lines: splitTreeText([override.effect]),
      overridden: true,
      reminderText: [],
      title: override.name,
    };
  }

  if (node.isMastery) {
    const effectByNode = new Map(spec.masteryEffects);
    const selectedEffect = effectByNode.get(node.id);
    if (selectedEffect !== undefined) {
      const masteryEffect = node.masteryEffects.find((entry) => entry.effect === selectedEffect);
      if (masteryEffect) {
        return {
          flavourText: [],
          kind: "Mastery",
          lines: splitTreeText(masteryEffect.stats),
          overridden: false,
          reminderText: splitTreeText(masteryEffect.reminderText),
          title: node.name,
        };
      }
    }
  }

  return {
    flavourText: splitTreeText(node.flavourText),
    kind: getPassiveTreeNodeKindLabel(node),
    lines: splitTreeText(node.stats),
    overridden: false,
    reminderText: splitTreeText(node.reminderText),
    title: node.name,
  };
}

export function resolvePassiveTreeSprite(
  node: PassiveTreeLayoutNode,
  allocated: boolean,
  masterySelected: boolean,
  manifest: PassiveTreeSpriteManifest | undefined,
): PassiveTreeResolvedSprite | undefined {
  if (!manifest) {
    return undefined;
  }

  if (node.classStartIndex !== undefined) {
    return undefined;
  }

  if (node.isMastery) {
    if (allocated && masterySelected && node.activeIcon) {
      const resolved = resolveAtlasEntry(manifest, "masteryActiveSelected", node.activeIcon);
      if (resolved) {
        return resolved;
      }
    }

    if (allocated && node.inactiveIcon) {
      const resolved = resolveAtlasEntry(manifest, "masteryConnected", node.inactiveIcon);
      if (resolved) {
        return resolved;
      }
    }

    if (node.inactiveIcon) {
      return resolveAtlasEntry(manifest, "masteryInactive", node.inactiveIcon);
    }
  }

  if (node.isKeystone && node.icon) {
    return resolveAtlasEntries(manifest, [
      allocated ? "keystoneActive" : "keystoneInactive",
      allocated ? "notableActive" : "notableInactive",
      allocated ? "normalActive" : "normalInactive",
    ], node.icon);
  }

  if (node.isNotable && node.icon) {
    return resolveAtlasEntries(manifest, [
      allocated ? "notableActive" : "notableInactive",
      allocated ? "normalActive" : "normalInactive",
      allocated ? "keystoneActive" : "keystoneInactive",
    ], node.icon);
  }

  if (node.icon) {
    return resolveAtlasEntries(manifest, [
      allocated ? "normalActive" : "normalInactive",
      allocated ? "notableActive" : "notableInactive",
      allocated ? "keystoneActive" : "keystoneInactive",
    ], node.icon);
  }

  return undefined;
}

export function resolvePassiveTreeNodeFrameSprite(
  node: PassiveTreeLayoutNode,
  allocated: boolean,
  manifest: PassiveTreeSpriteManifest | undefined,
): PassiveTreeResolvedSprite | undefined {
  if (!manifest || node.classStartIndex !== undefined || node.isMastery) {
    return undefined;
  }

  if (node.isKeystone) {
    return resolveAtlasEntry(manifest, "frame", allocated ? "KeystoneFrameAllocated" : "KeystoneFrameUnallocated");
  }

  if (node.isNotable) {
    return resolveAtlasEntry(manifest, "frame", allocated ? "NotableFrameAllocated" : "NotableFrameUnallocated");
  }

  if (node.isJewelSocket) {
    return resolveAtlasEntry(manifest, "frame", allocated ? "JewelFrameAllocated" : "JewelFrameUnallocated");
  }

  return resolveAtlasEntry(manifest, "frame", allocated ? "PSSkillFrameActive" : "PSSkillFrame");
}

export function resolvePassiveTreeClassStartSprite(
  node: PassiveTreeLayoutNode,
  allocated: boolean,
  manifest: PassiveTreeSpriteManifest | undefined,
): PassiveTreeResolvedSprite | undefined {
  if (!manifest || node.classStartIndex === undefined) {
    return undefined;
  }

  return resolveAtlasEntry(
    manifest,
    "startNode",
    allocated ? node.startArt ?? "PSStartNodeBackgroundInactive" : "PSStartNodeBackgroundInactive",
  );
}

export function resolvePassiveTreeGroupBackgroundSprite(
  group: PassiveTreeLayoutGroup,
  manifest: PassiveTreeSpriteManifest | undefined,
): PassiveTreeResolvedSprite | undefined {
  if (!manifest || !group.backgroundSpriteKey) {
    return undefined;
  }

  return resolveAtlasEntry(manifest, "groupBackground", group.backgroundSpriteKey);
}

function getOrderedVariantKeys(manifest: PassiveTreeManifest): string[] {
  const presentKeys = new Set(Object.keys(manifest.variants));
  const ordered = PASSIVE_TREE_VARIANT_ORDER.filter((key) => presentKeys.has(key));

  for (const key of Object.keys(manifest.variants).sort()) {
    if (!ordered.includes(key as PassiveTreeVariantKey)) {
      ordered.push(key as PassiveTreeVariantKey);
    }
  }

  return ordered;
}

function getNodeIdSet(nodeIds: readonly number[]): Set<number> {
  const cached = nodeIdSetCache.get(nodeIds as number[]);
  if (cached) {
    return cached;
  }

  const next = new Set(nodeIds);
  nodeIdSetCache.set(nodeIds as number[], next);
  return next;
}

function getNodeBounds(nodes: PassiveTreeLayoutNode[]) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x);
    maxY = Math.max(maxY, node.y);
  }

  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    maxX,
    maxY,
    minX,
    minY,
  };
}

function getRenderedContentBounds(
  allNodes: PassiveTreeLayoutNode[],
  focusNodes: PassiveTreeLayoutNode[],
  filterNodeIds?: Set<number>,
) {
  const focusNodeIds = new Set(focusNodes.map((node) => node.id));
  const nodeIndex = new Map(allNodes.map((node) => [node.id, node]));
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const includePoint = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  for (const node of focusNodes) {
    const renderedRadius = getPassiveTreeNodeRadius(node) * 1.4;
    includePoint(node.x - renderedRadius, node.y - renderedRadius);
    includePoint(node.x + renderedRadius, node.y + renderedRadius);
  }

  for (const link of buildPassiveTreeLinks(allNodes, filterNodeIds)) {
    if (!focusNodeIds.has(link.sourceId) || !focusNodeIds.has(link.targetId)) {
      continue;
    }

    const left = nodeIndex.get(link.sourceId);
    const right = nodeIndex.get(link.targetId);
    if (!left || !right) {
      continue;
    }

    if (shouldUseOrbitArc(left, right)) {
      const arcBounds = getOrbitArcBounds(left, right);
      includePoint(arcBounds.minX, arcBounds.minY);
      includePoint(arcBounds.maxX, arcBounds.maxY);
      continue;
    }

    includePoint(left.x, left.y);
    includePoint(right.x, right.y);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return getNodeBounds(focusNodes);
  }

  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    maxX,
    maxY,
    minX,
    minY,
  };
}

function getOrbitArcBounds(left: PassiveTreeLayoutNode, right: PassiveTreeLayoutNode) {
  const centerX = left.groupCenterX ?? right.groupCenterX ?? average(left.x, right.x);
  const centerY = left.groupCenterY ?? right.groupCenterY ?? average(left.y, right.y);
  const radius =
    left.orbitRadius ??
    right.orbitRadius ??
    average(getDistance(left.x, left.y, centerX, centerY), getDistance(right.x, right.y, centerX, centerY));
  const startAngle = Math.atan2(left.y - centerY, left.x - centerX);
  const endAngle = Math.atan2(right.y - centerY, right.x - centerX);
  const delta = normalizeAngle(endAngle - startAngle);
  const candidateAngles = [startAngle, endAngle, 0, Math.PI / 2, Math.PI, -Math.PI / 2];

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const angle of candidateAngles) {
    if (!isAngleOnOrbitArc(angle, startAngle, delta)) {
      continue;
    }

    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  return {
    maxX,
    maxY,
    minX,
    minY,
  };
}

function isAngleOnOrbitArc(angle: number, startAngle: number, delta: number) {
  const normalizedStart = normalizePositiveAngle(startAngle);
  const normalizedAngle = normalizePositiveAngle(angle);

  if (delta >= 0) {
    let sweepAngle = normalizedAngle;
    while (sweepAngle < normalizedStart) {
      sweepAngle += Math.PI * 2;
    }
    return sweepAngle <= normalizedStart + delta + 1e-6;
  }

  let sweepAngle = normalizedAngle;
  while (sweepAngle > normalizedStart) {
    sweepAngle -= Math.PI * 2;
  }
  return sweepAngle >= normalizedStart + delta - 1e-6;
}

function buildPassiveTreeAdjacency(nodes: PassiveTreeLayoutNode[]): Map<number, Set<number>> {
  const links = buildPassiveTreeLinks(nodes);
  const adjacency = new Map<number, Set<number>>();

  for (const node of nodes) {
    adjacency.set(node.id, new Set<number>());
  }

  for (const link of links) {
    adjacency.get(link.sourceId)?.add(link.targetId);
    adjacency.get(link.targetId)?.add(link.sourceId);
  }

  return adjacency;
}

function canReachPassiveTreeRootsWithoutNode(
  startNodeId: number,
  blockedNodeId: number,
  adjacency: ReadonlyMap<number, ReadonlySet<number>>,
  rootNodeIds: ReadonlySet<number>,
): boolean {
  if (startNodeId === blockedNodeId) {
    return false;
  }

  const queue = [startNodeId];
  const visited = new Set<number>([blockedNodeId]);

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (nodeId === undefined || visited.has(nodeId)) {
      continue;
    }

    if (rootNodeIds.has(nodeId)) {
      return true;
    }

    visited.add(nodeId);
    for (const neighborId of adjacency.get(nodeId) ?? []) {
      if (!visited.has(neighborId)) {
        queue.push(neighborId);
      }
    }
  }

  return false;
}

function getClusterMetaNode(
  variant: PassiveTreeClusterVariantMeta,
  nodeId: number,
): PassiveTreeClusterNodeMeta | undefined {
  return variant.nodesById[String(nodeId)];
}

function findClusterSocketNodeId(
  variant: PassiveTreeClusterVariantMeta,
  groupId: number,
  expansionIndex: number,
  parentSocketId: number,
): number | undefined {
  for (const [rawNodeId, node] of Object.entries(variant.nodesById)) {
    const meta = node as PassiveTreeClusterNodeMeta;
    if (
      meta.groupId !== groupId ||
      !meta.expansionJewel ||
      meta.expansionJewel.index !== expansionIndex ||
      meta.expansionJewel.parent !== parentSocketId
    ) {
      continue;
    }

    return Number(rawNodeId);
  }

  return undefined;
}

function resolvePassiveJewelRadius(item: ItemPayload): ItemJewelRadius | undefined {
  if (!(item.base ?? "").toLowerCase().includes("jewel")) {
    return undefined;
  }

  return item.jewelRadius ?? inferPassiveJewelRadiusFromRaw(item.raw);
}

function inferPassiveJewelRadiusFromRaw(raw: string): ItemJewelRadius | undefined {
  if (!raw) {
    return undefined;
  }

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^[-]+$/.test(line));
  const selectedVariant = parseSelectedVariantIndex(lines);
  const radiusLine = lines.find((line) => line.startsWith("Radius:"));
  if (!radiusLine) {
    return extractVariableRingRadius(lines, selectedVariant);
  }

  const radiusLabel = radiusLine.slice("Radius:".length).trim();
  if (/^Variable$/i.test(radiusLabel)) {
    return extractVariableRingRadius(lines, selectedVariant);
  }

  return normalizePassiveJewelRadiusLabel(radiusLabel);
}

function parseSelectedVariantIndex(lines: string[]): number | undefined {
  const selectedVariantPrefix = "Selected Variant:";
  const line = lines.find((entry) => entry.startsWith(selectedVariantPrefix));
  if (!line) {
    return undefined;
  }

  const value = Number(line.slice(selectedVariantPrefix.length).trim());
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function extractVariableRingRadius(lines: string[], selectedVariant?: number): ItemJewelRadius | undefined {
  for (const line of lines) {
    if (!matchesSelectedVariantLine(line, selectedVariant)) {
      continue;
    }

    const match = stripLineTags(line).match(
      /^Only affects Passives in (Small|Medium|Large|Very Large|Massive) Ring(?:\s*\([^)]+\))?$/i,
    );
    if (match) {
      return normalizePassiveJewelRadiusLabel(match[1]);
    }
  }

  return undefined;
}

function matchesSelectedVariantLine(line: string, selectedVariant?: number): boolean {
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

function stripLineTags(line: string): string {
  return line.replace(/\{[^}]+\}/g, "").trim();
}

function normalizePassiveJewelRadiusLabel(label: string): ItemJewelRadius | undefined {
  const normalized = label.trim().toLowerCase().replace(/\s+/g, " ");
  if (normalized === "small") {
    return "small";
  }
  if (normalized === "medium") {
    return "medium";
  }
  if (normalized === "large") {
    return "large";
  }
  if (normalized === "very large") {
    return "veryLarge";
  }
  if (normalized === "massive") {
    return "massive";
  }
  return undefined;
}

function parseClusterJewel(item: ItemPayload): ParsedClusterJewel | undefined {
  const sizeMatch = (item.base ?? item.name ?? "").match(/\b(Large|Medium|Small) Cluster Jewel\b/i);
  if (!sizeMatch) {
    return undefined;
  }

  const sizeName = `${capitalize(sizeMatch[1].toLowerCase())} Cluster Jewel` as ParsedClusterJewel["sizeName"];
  const lines = collectClusterItemLines(item);
  const notableNames = lines
    .map((line) => line.match(/^1 Added Passive Skill is (.+)$/)?.[1]?.trim())
    .filter((line): line is string => Boolean(line && line.toLowerCase() !== "a jewel socket"));
  const socketCount = extractClusterSocketCount(lines);
  const nodeCount = extractClusterNodeCount(lines, socketCount, notableNames.length);
  if (nodeCount === undefined) {
    return undefined;
  }

  const smallPassiveLines = lines
    .filter((line) => line.startsWith(CLUSTER_SMALL_PASSIVE_GRANT_PREFIX))
    .map((line) => line.slice(CLUSTER_SMALL_PASSIVE_GRANT_PREFIX.length).trim());
  const addedSmallPassiveLines = lines
    .filter(
      (line) =>
        line.startsWith("Added Small Passive Skills ") && !line.startsWith(CLUSTER_SMALL_PASSIVE_GRANT_PREFIX),
    )
    .map(formatClusterSmallPassiveLine);

  return {
    addedSmallPassiveLines,
    nodeCount,
    notableNames,
    sizeName,
    smallPassiveLines,
    socketCount: Number.isFinite(socketCount) ? socketCount : 0,
  };
}

function collectClusterItemLines(item: ItemPayload) {
  const orderedExplicitLines = item.orderedExplicitMods?.map((mod) => mod.text) ?? [];
  const lines = [
    ...item.enchantments,
    ...item.implicits,
    ...orderedExplicitLines,
    ...item.explicits,
    ...item.crafted,
    ...item.fracturedMods,
    ...item.scourgedMods,
    ...item.crucibleMods,
    ...item.synthesizedMods,
  ];

  return [...new Set(lines.map((line) => line.trim()).filter((line) => line.length > 0))];
}

function extractClusterSocketCount(lines: string[]) {
  const explicitSocketLine = lines.find((line) => /^Adds \d+ Jewel Socket Passive Skills?$/i.test(line));
  const explicitSocketCount = Number(explicitSocketLine?.match(/^Adds (\d+) Jewel Socket Passive Skills?$/i)?.[1]);
  if (Number.isFinite(explicitSocketCount)) {
    return explicitSocketCount;
  }

  const implicitSocketLine = lines.find((line) => /^\d+ Added Passive Skill(?:s)? (?:are|is)(?: a)? Jewel Socket(?:s)?$/i.test(line));
  const implicitSocketCount = Number(
    implicitSocketLine?.match(/^(\d+) Added Passive Skill(?:s)? (?:are|is)(?: a)? Jewel Socket(?:s)?$/i)?.[1] ?? 0,
  );
  return Number.isFinite(implicitSocketCount) ? implicitSocketCount : 0;
}

function extractClusterNodeCount(lines: string[], socketCount: number, notableCount: number) {
  const totalNodeLine = lines.find((line) => /^Adds \d+ Passive Skills$/i.test(line));
  const totalNodeCount = Number(totalNodeLine?.match(/^Adds (\d+) Passive Skills$/i)?.[1]);
  if (Number.isFinite(totalNodeCount)) {
    return totalNodeCount;
  }

  const smallPassiveLine = lines.find((line) => /^Adds \d+ Small Passive Skills?(?: which grant.+)?$/i.test(line));
  const smallPassiveCount = Number(smallPassiveLine?.match(/^Adds (\d+) Small Passive Skills?(?: which grant.+)?$/i)?.[1]);
  if (Number.isFinite(smallPassiveCount)) {
    return smallPassiveCount + socketCount + notableCount;
  }

  return undefined;
}

function formatClusterSmallPassiveLine(line: string) {
  if (line.startsWith(CLUSTER_SMALL_PASSIVE_ALSO_GRANT_PREFIX)) {
    return line.slice(CLUSTER_SMALL_PASSIVE_ALSO_GRANT_PREFIX.length).trim();
  }

  return line.trim();
}

function compareClusterNotables(left: string, right: string) {
  const leftOrder = PASSIVE_TREE_CLUSTER_NOTABLE_SORT_ORDER[left] ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = PASSIVE_TREE_CLUSTER_NOTABLE_SORT_ORDER[right] ?? Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return left.localeCompare(right);
}

function gatherClusterNotableIndices(
  clusterTemplate: PassiveTreeClusterTemplateMeta,
  parsedClusterJewel: ParsedClusterJewel,
  existingNodes: ReadonlyMap<number, PassiveTreeLayoutNode>,
) {
  const notableIndices: number[] = [];
  for (const originalNodeIndex of clusterTemplate.notableIndices) {
    if (notableIndices.length >= parsedClusterJewel.notableNames.length) {
      break;
    }

    let nodeIndex: number = originalNodeIndex;
    if (parsedClusterJewel.sizeName === "Medium Cluster Jewel") {
      if (parsedClusterJewel.socketCount === 0 && parsedClusterJewel.notableNames.length === 2) {
        if (nodeIndex === 6) {
          nodeIndex = 4;
        } else if (nodeIndex === 10) {
          nodeIndex = 8;
        }
      } else if (parsedClusterJewel.nodeCount === 4) {
        if (nodeIndex === 10) {
          nodeIndex = 9;
        } else if (nodeIndex === 2) {
          nodeIndex = 3;
        }
      }
    }

    if (!existingNodes.has(nodeIndex)) {
      notableIndices.push(nodeIndex);
    }
  }

  return notableIndices;
}

function gatherClusterSmallIndices(
  clusterTemplate: PassiveTreeClusterTemplateMeta,
  parsedClusterJewel: ParsedClusterJewel,
  existingNodes: ReadonlyMap<number, PassiveTreeLayoutNode>,
) {
  const targetCount = Math.max(parsedClusterJewel.nodeCount - parsedClusterJewel.socketCount - parsedClusterJewel.notableNames.length, 0);
  const smallIndices: number[] = [];
  for (const originalNodeIndex of clusterTemplate.smallIndices) {
    if (smallIndices.length >= targetCount) {
      break;
    }

    let nodeIndex: number = originalNodeIndex;
    if (parsedClusterJewel.sizeName === "Medium Cluster Jewel") {
      if (parsedClusterJewel.nodeCount === 5 && nodeIndex === 4) {
        nodeIndex = 3;
      } else if (parsedClusterJewel.nodeCount === 4) {
        if (nodeIndex === 8) {
          nodeIndex = 9;
        } else if (nodeIndex === 4) {
          nodeIndex = 3;
        }
      }
    }

    if (!existingNodes.has(nodeIndex)) {
      smallIndices.push(nodeIndex);
    }
  }

  return smallIndices;
}

function getClusterCorrectedOrbitIndex(
  sourceOrbitIndex: number,
  clusterTotalIndices: number,
  proxyNode: PassiveTreeLayoutNode,
) {
  const proxySkillsPerOrbit = PASSIVE_TREE_SKILLS_PER_ORBIT[proxyNode.orbit] ?? clusterTotalIndices;
  const proxyRelativeOrbitIndex = translateClusterOrbitIndex(proxyNode.orbitIndex, proxySkillsPerOrbit, clusterTotalIndices);
  const correctedClusterOrbitIndex = (sourceOrbitIndex + proxyRelativeOrbitIndex) % clusterTotalIndices;
  return translateClusterOrbitIndex(correctedClusterOrbitIndex, clusterTotalIndices, proxySkillsPerOrbit);
}

function translateClusterOrbitIndex(sourceOrbitIndex: number, sourceNodeCount: number, targetNodeCount: number) {
  if (sourceNodeCount === targetNodeCount) {
    return sourceOrbitIndex;
  }

  if (sourceNodeCount === 12 && targetNodeCount === 16) {
    return [0, 1, 3, 4, 5, 7, 8, 9, 11, 12, 13, 15][sourceOrbitIndex] ?? sourceOrbitIndex;
  }

  if (sourceNodeCount === 16 && targetNodeCount === 12) {
    return [0, 1, 1, 2, 3, 4, 4, 5, 6, 7, 7, 8, 9, 10, 10, 11][sourceOrbitIndex] ?? sourceOrbitIndex;
  }

  return Math.floor((sourceOrbitIndex * targetNodeCount) / Math.max(sourceNodeCount, 1));
}

function getPassiveTreeOrbitAngle(orbit: number, orbitIndex: number) {
  const nodesInOrbit = PASSIVE_TREE_SKILLS_PER_ORBIT[orbit] ?? 1;
  if (nodesInOrbit === 16) {
    return degreesToRadians([0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330][orbitIndex] ?? 0);
  }

  if (nodesInOrbit === 40) {
    const angles = [
      0, 10, 20, 30, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 130, 135, 140, 150, 160, 170, 180, 190, 200, 210,
      220, 225, 230, 240, 250, 260, 270, 280, 290, 300, 310, 315, 320, 330, 340, 350,
    ];
    return degreesToRadians(angles[orbitIndex] ?? 0);
  }

  return degreesToRadians((360 * orbitIndex) / Math.max(nodesInOrbit, 1));
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(2));
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

function capitalize(value: string) {
  return value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value;
}

function getPassiveTreeNodeKindLabel(node: PassiveTreeLayoutNode): string {
  switch (getPassiveTreeNodeKind(node)) {
    case "class-start":
      return "Class Start";
    case "jewel-socket":
      return "Jewel Socket";
    case "keystone":
      return "Keystone";
    case "mastery":
      return "Mastery";
    case "notable":
      return "Notable";
    default:
      return "Passive";
  }
}

function resolveAtlasEntry(
  manifest: PassiveTreeSpriteManifest,
  atlasName: string,
  iconKey: string,
): PassiveTreeResolvedSprite | undefined {
  const atlas = manifest.atlases[atlasName];
  if (!atlas || !atlas.imagePath) {
    return undefined;
  }

  const entry = atlas.coords[iconKey];
  if (!entry) {
    return undefined;
  }

  return {
    atlas,
    entry,
  };
}

function resolveAtlasEntries(
  manifest: PassiveTreeSpriteManifest,
  atlasNames: readonly string[],
  iconKey: string,
): PassiveTreeResolvedSprite | undefined {
  for (const atlasName of atlasNames) {
    const resolved = resolveAtlasEntry(manifest, atlasName, iconKey);
    if (resolved) {
      return resolved;
    }
  }

  return undefined;
}

function getAscendancyRegionNodeIds(
  nodes: PassiveTreeLayoutNode[],
  nodeIndex: Map<number, PassiveTreeLayoutNode>,
) {
  const adjacency = new Map<number, Set<number>>();
  for (const node of nodes) {
    if (!adjacency.has(node.id)) {
      adjacency.set(node.id, new Set());
    }

    for (const targetId of node.out) {
      if (!nodeIndex.has(targetId)) {
        continue;
      }

      if (!adjacency.has(targetId)) {
        adjacency.set(targetId, new Set());
      }

      adjacency.get(node.id)?.add(targetId);
      adjacency.get(targetId)?.add(node.id);
    }
  }

  const ascendancyRegionNodeIds = new Set<number>();
  const queue = nodes.filter((node) => node.isAscendancyStart === true).map((node) => node.id);

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (nodeId === undefined || ascendancyRegionNodeIds.has(nodeId)) {
      continue;
    }

    ascendancyRegionNodeIds.add(nodeId);
    for (const neighborId of adjacency.get(nodeId) ?? []) {
      const neighbor = nodeIndex.get(neighborId);
      if (!neighbor || neighbor.classStartIndex !== undefined || ascendancyRegionNodeIds.has(neighborId)) {
        continue;
      }

      queue.push(neighborId);
    }
  }

  return ascendancyRegionNodeIds;
}

function isAscendancyBoundaryEdge(leftId: number, rightId: number, ascendancyRegionNodeIds: Set<number>) {
  return ascendancyRegionNodeIds.has(leftId) !== ascendancyRegionNodeIds.has(rightId);
}

function isScionStartScaffoldEdge(left: PassiveTreeLayoutNode, right: PassiveTreeLayoutNode) {
  return left.classStartIndex === 0 || right.classStartIndex === 0;
}

function isAscendantClassPathBridgeEdge(left: PassiveTreeLayoutNode, right: PassiveTreeLayoutNode) {
  return (
    (isAscendantClassPathNode(left) && !isAscendancyPassivePoint(right)) ||
    (isAscendantClassPathNode(right) && !isAscendancyPassivePoint(left))
  );
}

function isAscendantClassPathNode(node: PassiveTreeLayoutNode) {
  return node.stats.some((line) => /Can Allocate Passives from the .+ starting point/i.test(line));
}

function isAscendancyPassivePoint(node: PassiveTreeLayoutNode) {
  return node.name === "Passive Point";
}

function isClusterJewelSocket(node: PassiveTreeLayoutNode) {
  return node.isJewelSocket && CLUSTER_JEWEL_SOCKET_NAMES.has(node.name);
}

function isClusterExpansionSocket(node: PassiveTreeLayoutNode) {
  return isClusterJewelSocket(node) || node.name === "Basic Jewel Socket";
}

function isClusterJewelItem(item: ItemPayload) {
  return /(?:^|\s)Cluster Jewel$/i.test(item.base ?? "") || /(?:^|\s)Cluster Jewel$/i.test(item.name ?? "");
}

function isSecondaryAscendancyName(name: string) {
  return SECONDARY_ASCENDANCY_NAMES.has(name) || /bloodline/i.test(name);
}

function getAscendancyAnchorTargets(layout: PassiveTreeLayout) {
  const largeJewelSockets = layout.nodes.filter((node) => node.name === "Large Jewel Socket");
  const rightSocket = largeJewelSockets
    .filter((node) => node.x > 0)
    .sort((left, right) => right.x - left.x)[0];
  const topRightSocket = largeJewelSockets
    .filter((node) => node.x > 0 && node.y < 0)
    .sort((left, right) => left.y - right.y)[0];
  const leftSocket = largeJewelSockets
    .filter((node) => node.x < 0)
    .sort((left, right) => left.x - right.x)[0];
  const topLeftSocket = largeJewelSockets
    .filter((node) => node.x < 0 && node.y < 0)
    .sort((left, right) => left.y - right.y)[0];

  return {
    primary: {
      x: rightSocket?.x ?? layout.bounds.maxX * PRIMARY_ASCENDANCY_TARGET_X_FACTOR,
      y: topRightSocket?.y ?? layout.bounds.minY * ASCENDANCY_TARGET_Y_FACTOR,
    },
    secondary: {
      x: leftSocket?.x ?? layout.bounds.minX * SECONDARY_ASCENDANCY_TARGET_X_FACTOR,
      y: topLeftSocket?.y ?? layout.bounds.minY * ASCENDANCY_TARGET_Y_FACTOR,
    },
  };
}

function isPassiveTreeProxyNode(node: PassiveTreeLayoutNode) {
  return node.name === "Position Proxy";
}

function shouldUseOrbitArc(left: PassiveTreeLayoutNode, right: PassiveTreeLayoutNode) {
  if (left.groupId !== right.groupId || left.orbit <= 0 || right.orbit <= 0 || left.orbit !== right.orbit) {
    return false;
  }

  if (
    left.groupCenterX === undefined ||
    left.groupCenterY === undefined ||
    right.groupCenterX === undefined ||
    right.groupCenterY === undefined
  ) {
    return false;
  }

  const leftRadius = getDistance(left.x, left.y, left.groupCenterX, left.groupCenterY);
  const rightRadius = getDistance(right.x, right.y, right.groupCenterX, right.groupCenterY);
  return Math.abs(leftRadius - rightRadius) <= 32 && leftRadius >= 24 && rightRadius >= 24;
}

function buildOrbitArcPath(left: PassiveTreeLayoutNode, right: PassiveTreeLayoutNode) {
  const centerX = left.groupCenterX ?? right.groupCenterX ?? average(left.x, right.x);
  const centerY = left.groupCenterY ?? right.groupCenterY ?? average(left.y, right.y);
  const radius = left.orbitRadius ?? right.orbitRadius ?? average(
    getDistance(left.x, left.y, centerX, centerY),
    getDistance(right.x, right.y, centerX, centerY),
  );
  const startAngle = Math.atan2(left.y - centerY, left.x - centerX);
  const endAngle = Math.atan2(right.y - centerY, right.x - centerX);
  const delta = normalizeAngle(endAngle - startAngle);
  const sweepFlag = delta > 0 ? 1 : 0;

  return `M ${formatPathNumber(left.x)} ${formatPathNumber(left.y)} A ${formatPathNumber(radius)} ${formatPathNumber(radius)} 0 0 ${sweepFlag} ${formatPathNumber(right.x)} ${formatPathNumber(right.y)}`;
}

function buildLinePath(left: PassiveTreeLayoutNode, right: PassiveTreeLayoutNode) {
  return `M ${formatPathNumber(left.x)} ${formatPathNumber(left.y)} L ${formatPathNumber(right.x)} ${formatPathNumber(right.y)}`;
}

function splitTreeText(lines: string[]) {
  return lines.flatMap((line) =>
    String(line)
      .split("\n")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getDistance(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

function normalizeAngle(value: number) {
  let angle = value;
  while (angle <= -Math.PI) {
    angle += Math.PI * 2;
  }
  while (angle > Math.PI) {
    angle -= Math.PI * 2;
  }
  return angle;
}

function normalizePositiveAngle(value: number) {
  let angle = value;
  while (angle < 0) {
    angle += Math.PI * 2;
  }
  while (angle >= Math.PI * 2) {
    angle -= Math.PI * 2;
  }
  return angle;
}

function average(left: number, right: number) {
  return (left + right) / 2;
}

function formatPathNumber(value: number) {
  return Number(value.toFixed(2));
}
