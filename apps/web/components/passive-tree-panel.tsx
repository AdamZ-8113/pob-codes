"use client";

import type {
  CSSProperties,
  FocusEvent as ReactFocusEvent,
  MouseEvent as ReactMouseEvent,
  Dispatch,
  PointerEvent as ReactPointerEvent,
  SetStateAction,
  WheelEvent as ReactWheelEvent,
} from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { BuildPayload } from "@pobcodes/shared-types";

import { getSelectedTreeSpec, getTreeSpecLabel } from "../lib/build-viewer-selection";
import { GENERATED_TREE_MANIFEST } from "../lib/generated/tree-manifest";
import {
  augmentPassiveTreeLayoutWithClusters,
  buildPassiveTreeJewelRadiusOverlays,
  buildPassiveTreeLinks,
  buildAllocatedPassiveTreeLinks,
  clampPassiveTreePan,
  describePassiveTreeNode,
  getPassiveTreeCenteredViewport,
  getPassiveTreeDisplayLayout,
  getPassiveTreeInitialViewport,
  getVisiblePassiveTreeNodeIds,
  getPassiveTreeLinkPath,
  getPassiveTreeNodeKind,
  getPassiveTreeNodeRadius,
  getPassiveTreeViewBounds,
  PASSIVE_TREE_MAX_ZOOM,
  pickPassiveTreeVariant,
  type PassiveTreeLink,
  type PassiveTreeLayout,
  type PassiveTreeLayoutNode,
  type PassiveTreeManifest,
  type PassiveTreeNodeKind,
  type PassiveTreeNodeDescription,
  type PassiveTreeResolvedSprite,
  type PassiveTreeSpriteManifest,
  type PassiveTreeViewBounds,
  type PassiveTreeViewport,
  resolvePassiveTreeSprite,
} from "../lib/passive-tree";
import { resolveTimelessKeystoneTransformations } from "../lib/passive-tree-timeless";
import { ItemTooltip } from "./items-panel";

const WHEEL_ZOOM_SENSITIVITY = 0.0018;
const DEFAULT_VIEWPORT: PassiveTreeViewport = {
  panX: 0,
  panY: 0,
  zoom: 1.4,
};
const MIN_INTERACTIVE_ZOOM = DEFAULT_VIEWPORT.zoom;
const PASSIVE_TREE_PREFETCH_ROOT_MARGIN = "960px 0px";
const ZOOM_EPSILON = 0.0001;

type LayoutState =
  | { status: "idle" | "loading" }
  | { status: "ready"; layout: PassiveTreeLayout }
  | { status: "error"; error: string };

interface HoveredTreeNodeState {
  clientX: number;
  clientY: number;
  nodeId: number;
}

interface PassiveTreeHeaderSummaryEntry {
  key: string;
  label: string;
  value: number;
}

interface PassiveTreeNodeBatchPaths {
  corePath: string;
  kind: PassiveTreeNodeKind;
  ringPath: string;
}

interface BatchedPassiveTreeNodes {
  batches: PassiveTreeNodeBatchPaths[];
  shadowPath: string;
}

const PASSIVE_TREE_NODE_BATCH_KINDS: PassiveTreeNodeKind[] = [
  "passive",
  "notable",
  "keystone",
  "mastery",
  "jewel-socket",
  "class-start",
];

function countTreeOverrides(overrides: BuildPayload["treeSpecs"][number]["overrides"], pattern: RegExp): number {
  return overrides.reduce((count, override) => (pattern.test(override.name) ? count + 1 : count), 0);
}

interface PassiveTreeOverrideGroup {
  count: number;
  lines: string[];
  title: string;
}

function groupTreeOverrides(
  overrides: BuildPayload["treeSpecs"][number]["overrides"],
  pattern: RegExp,
): PassiveTreeOverrideGroup[] {
  const groups = new Map<string, PassiveTreeOverrideGroup>();

  for (const override of overrides) {
    if (!pattern.test(override.name)) {
      continue;
    }

    const existing = groups.get(override.name);
    if (existing) {
      existing.count += 1;
      if (override.effect.length > 0 && !existing.lines.includes(override.effect)) {
        existing.lines.push(override.effect);
      }
      continue;
    }

    groups.set(override.name, {
      count: 1,
      lines: override.effect.length > 0 ? [override.effect] : [],
      title: override.name,
    });
  }

  return [...groups.values()];
}

interface PassiveTreePanelProps {
  payload: BuildPayload;
  treeIndex?: number;
  onTreeIndexChange?: (treeIndex: number) => void;
}

export function PassiveTreePanel({ onTreeIndexChange, payload, treeIndex: controlledTreeIndex }: PassiveTreePanelProps) {
  const treeManifest = GENERATED_TREE_MANIFEST as PassiveTreeManifest;
  const initialIndex = useMemo(() => {
    const active = payload.treeSpecs.findIndex((tree) => tree.active);
    return active >= 0 ? active : Math.max(payload.activeTreeIndex, 0);
  }, [payload.activeTreeIndex, payload.treeSpecs]);
  const [internalTreeIndex, setInternalTreeIndex] = useState(initialIndex);
  const [layoutState, setLayoutState] = useState<LayoutState>({ status: "idle" });
  const [hoveredNodeState, setHoveredNode] = useState<HoveredTreeNodeState | null>(null);
  const [displayZoom, setDisplayZoom] = useState(DEFAULT_VIEWPORT.zoom);
  const [treeAssetsActivated, setTreeAssetsActivated] = useState(false);
  const [zoomUnlocked, setZoomUnlocked] = useState(false);
  const [spriteManifest, setSpriteManifest] = useState<PassiveTreeSpriteManifest | undefined>(undefined);
  const panelRef = useRef<HTMLElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const sceneRef = useRef<SVGGElement | null>(null);
  const dragRef = useRef<{ clientX: number; clientY: number; pointerId: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const viewBoundsRef = useRef<PassiveTreeViewBounds | undefined>(undefined);
  const viewportRef = useRef<PassiveTreeViewport>(DEFAULT_VIEWPORT);

  const treeIndex = controlledTreeIndex ?? internalTreeIndex;
  const hoveredNodeId = hoveredNodeState?.nodeId ?? null;
  const activateTreeAssets = useCallback(() => {
    setTreeAssetsActivated(true);
  }, []);

  useEffect(() => {
    if (controlledTreeIndex === undefined) {
      setInternalTreeIndex(initialIndex);
    }
  }, [controlledTreeIndex, initialIndex]);

  useEffect(() => {
    if (treeAssetsActivated) {
      return;
    }

    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setTreeAssetsActivated(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) {
          setTreeAssetsActivated(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: PASSIVE_TREE_PREFETCH_ROOT_MARGIN,
      },
    );

    observer.observe(panel);
    return () => observer.disconnect();
  }, [treeAssetsActivated]);

  const activeTree = getSelectedTreeSpec(payload, treeIndex);
  const activeVariantKey = useMemo(() => pickPassiveTreeVariant(activeTree, treeManifest), [activeTree, treeManifest]);
  const activeVariant = activeVariantKey ? treeManifest.variants[activeVariantKey] : undefined;
  const layout = layoutState.status === "ready" ? layoutState.layout : undefined;
  const viewBounds = useMemo(() => (layout ? getPassiveTreeViewBounds(layout.bounds) : undefined), [layout]);
  const staticViewBox = useMemo(
    () => (viewBounds ? `${viewBounds.minX} ${viewBounds.minY} ${viewBounds.width} ${viewBounds.height}` : undefined),
    [viewBounds],
  );

  const renderViewport = useCallback(() => {
    animationFrameRef.current = null;

    const scene = sceneRef.current;
    const nextViewBounds = viewBoundsRef.current;
    if (!scene || !nextViewBounds) {
      return;
    }

    const { panX, panY, zoom } = viewportRef.current;
    scene.setAttribute(
      "transform",
      [
        `translate(${nextViewBounds.centerX} ${nextViewBounds.centerY})`,
        `scale(${zoom})`,
        `translate(${-nextViewBounds.centerX - panX} ${-nextViewBounds.centerY - panY})`,
      ].join(" "),
    );
  }, []);

  const scheduleViewportRender = useCallback(() => {
    if (animationFrameRef.current !== null) {
      return;
    }
    animationFrameRef.current = window.requestAnimationFrame(renderViewport);
  }, [renderViewport]);

  const applyViewport = useCallback(
    (nextViewport: PassiveTreeViewport) => {
      const nextViewBounds = viewBoundsRef.current;
      if (!nextViewBounds) {
        return;
      }

      const zoom = clamp(nextViewport.zoom, MIN_INTERACTIVE_ZOOM, PASSIVE_TREE_MAX_ZOOM);
      const pan = clampPassiveTreePan(nextViewBounds, zoom, nextViewport.panX, nextViewport.panY);

      viewportRef.current = {
        panX: pan.panX,
        panY: pan.panY,
        zoom,
      };
      setDisplayZoom((current) => (Math.abs(current - zoom) > ZOOM_EPSILON ? zoom : current));

      scheduleViewportRender();
    },
    [scheduleViewportRender],
  );

  const zoomAtClientPoint = useCallback(
    (targetZoom: number, clientX: number, clientY: number) => {
      const nextViewBounds = viewBoundsRef.current;
      const svg = svgRef.current;
      if (!nextViewBounds || !svg) {
        return;
      }

      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      const normalizedX = clamp((clientX - rect.left) / rect.width, 0, 1);
      const normalizedY = clamp((clientY - rect.top) / rect.height, 0, 1);
      const screenWorldX = nextViewBounds.minX + normalizedX * nextViewBounds.width;
      const screenWorldY = nextViewBounds.minY + normalizedY * nextViewBounds.height;
      const currentViewport = viewportRef.current;
      const nextZoom = clamp(targetZoom, MIN_INTERACTIVE_ZOOM, PASSIVE_TREE_MAX_ZOOM);
      const worldX = (screenWorldX - nextViewBounds.centerX) / currentViewport.zoom + nextViewBounds.centerX + currentViewport.panX;
      const worldY = (screenWorldY - nextViewBounds.centerY) / currentViewport.zoom + nextViewBounds.centerY + currentViewport.panY;

      applyViewport({
        panX: worldX - nextViewBounds.centerX - (screenWorldX - nextViewBounds.centerX) / nextZoom,
        panY: worldY - nextViewBounds.centerY - (screenWorldY - nextViewBounds.centerY) / nextZoom,
        zoom: nextZoom,
      });
    },
    [applyViewport],
  );

  useEffect(() => {
    viewBoundsRef.current = viewBounds;
    if (viewBounds) {
      scheduleViewportRender();
    }
  }, [scheduleViewportRender, viewBounds]);

  useEffect(() => {
    if (!treeAssetsActivated) {
      return;
    }

    if (!treeManifest.spriteManifestPath) {
      setSpriteManifest(undefined);
      return;
    }

    const controller = new AbortController();
    fetch(treeManifest.spriteManifestPath, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load passive tree sprite manifest (${response.status}).`);
        }

        return (await response.json()) as unknown;
      })
      .then((nextManifest) => {
        if (controller.signal.aborted) {
          return;
        }
        setSpriteManifest(isPassiveTreeSpriteManifest(nextManifest) ? nextManifest : undefined);
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }
        setSpriteManifest(undefined);
      });

    return () => controller.abort();
  }, [treeAssetsActivated, treeManifest.spriteManifestPath]);

  useEffect(() => {
    if (!treeAssetsActivated) {
      return;
    }

    if (!activeVariant) {
      setLayoutState({ error: "Could not match this build to a supported passive tree variant.", status: "error" });
      return;
    }

    const controller = new AbortController();
    setLayoutState({ status: "loading" });

    fetch(activeVariant.layoutPath, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load passive tree layout (${response.status}).`);
        }
        return (await response.json()) as PassiveTreeLayout;
      })
      .then((nextLayout) => {
        setLayoutState({ layout: nextLayout, status: "ready" });
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        setLayoutState({
          error: error instanceof Error ? error.message : "Failed to load passive tree layout.",
          status: "error",
        });
      });

    return () => controller.abort();
  }, [activeVariant, treeAssetsActivated]);

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    },
    [],
  );

  const allocatedNodeIds = useMemo(() => new Set(activeTree?.nodes ?? []), [activeTree]);
  const itemsById = useMemo(() => new Map(payload.items.map((item) => [item.id, item])), [payload.items]);
  const augmentedLayout = useMemo(
    () => (layout && activeTree ? augmentPassiveTreeLayoutWithClusters(layout, activeTree, itemsById, activeVariantKey) : layout),
    [activeTree, activeVariantKey, itemsById, layout],
  );
  const visibleNodeIds = useMemo(
    () => (augmentedLayout && activeTree ? getVisiblePassiveTreeNodeIds(augmentedLayout.nodes, activeTree, itemsById) : new Set<number>()),
    [activeTree, augmentedLayout, itemsById],
  );
  const displayLayout = useMemo(
    () => (augmentedLayout ? getPassiveTreeDisplayLayout(augmentedLayout, visibleNodeIds) : undefined),
    [augmentedLayout, visibleNodeIds],
  );
  const layoutNodeIndex = useMemo(
    () => new Map(augmentedLayout?.nodes.map((node) => [node.id, node]) ?? []),
    [augmentedLayout],
  );
  const nodeIndex = useMemo(() => new Map(displayLayout?.nodes.map((node) => [node.id, node]) ?? []), [displayLayout]);
  useEffect(() => {
    if (!displayLayout || !activeTree || !viewBounds) {
      return;
    }

    const nextViewport = getPassiveTreeCenteredViewport(displayLayout, visibleNodeIds, DEFAULT_VIEWPORT.zoom, viewBounds);
    setHoveredNode(null);
    applyViewport(nextViewport);
  }, [activeTree, applyViewport, displayLayout, viewBounds, visibleNodeIds]);
  const allocatedNodes = useMemo(
    () =>
      displayLayout ? displayLayout.nodes.filter((node) => visibleNodeIds.has(node.id) && allocatedNodeIds.has(node.id)) : [],
    [allocatedNodeIds, displayLayout, visibleNodeIds],
  );
  const inactiveNodes = useMemo(
    () =>
      displayLayout ? displayLayout.nodes.filter((node) => visibleNodeIds.has(node.id) && !allocatedNodeIds.has(node.id)) : [],
    [allocatedNodeIds, displayLayout, visibleNodeIds],
  );
  const activeLinks = useMemo(
    () =>
      displayLayout
        ? buildAllocatedPassiveTreeLinks(
            displayLayout.nodes,
            new Set([...allocatedNodeIds].filter((id) => visibleNodeIds.has(id))),
            visibleNodeIds,
          )
        : [],
    [allocatedNodeIds, displayLayout, visibleNodeIds],
  );
  const allLinks = useMemo(
    () => (displayLayout ? buildPassiveTreeLinks(displayLayout.nodes, visibleNodeIds) : []),
    [displayLayout, visibleNodeIds],
  );
  const allLinkPath = useMemo(() => buildPassiveTreeLinkBatchPath(allLinks, nodeIndex), [allLinks, nodeIndex]);
  const activeLinkPath = useMemo(() => buildPassiveTreeLinkBatchPath(activeLinks, nodeIndex), [activeLinks, nodeIndex]);
  const inactiveNodeBatch = useMemo(() => buildPassiveTreeNodeBatch(inactiveNodes), [inactiveNodes]);
  const jewelRadiusOverlays = useMemo(
    () =>
      displayLayout && activeTree
        ? buildPassiveTreeJewelRadiusOverlays(displayLayout, activeTree, itemsById).filter((overlay) =>
            visibleNodeIds.has(overlay.nodeId),
          )
        : [],
    [activeTree, displayLayout, itemsById, visibleNodeIds],
  );
  const hoveredNode = hoveredNodeId !== null ? nodeIndex.get(hoveredNodeId) : undefined;
  const hoveredSocketedItem = useMemo(() => {
    if (!activeTree || hoveredNodeId === null) {
      return undefined;
    }

    const socket = activeTree.sockets.find((entry) => entry.nodeId === hoveredNodeId);
    return socket ? itemsById.get(socket.itemId) : undefined;
  }, [activeTree, hoveredNodeId, itemsById]);
  const hoveredDescription = hoveredNode && activeTree ? describePassiveTreeNode(hoveredNode, activeTree) : undefined;
  const timelessKeystoneTransformations = useMemo(
    () => (activeTree ? resolveTimelessKeystoneTransformations(activeTree, layoutNodeIndex, itemsById) : new Map()),
    [activeTree, itemsById, layoutNodeIndex],
  );
  const keystoneEntries = useMemo<Array<{ description: PassiveTreeNodeDescription; id: number; sprite: PassiveTreeResolvedSprite | undefined }>>(() => {
    if (!activeTree) {
      return [];
    }

    return activeTree.nodes
      .map((nodeId) => nodeIndex.get(nodeId))
      .filter((node): node is PassiveTreeLayoutNode => Boolean(node?.isKeystone))
      .map((node) => {
        const transformedKeystone = timelessKeystoneTransformations.get(node.id);
        if (!transformedKeystone) {
          return {
            description: describePassiveTreeNode(node, activeTree),
            id: node.id,
            sprite: resolvePassiveTreeSprite(node, true, false, spriteManifest),
          };
        }

        return {
          description: {
            flavourText: [],
            kind: "Keystone",
            lines: transformedKeystone.lines,
            overridden: false,
            reminderText: [],
            title: `${transformedKeystone.name} (${node.name})`,
          },
          id: node.id,
          sprite: resolvePassiveTreeSprite(
            {
              ...node,
              icon: transformedKeystone.icon ?? node.icon,
            },
            true,
            false,
            spriteManifest,
          ),
        };
      });
  }, [activeTree, nodeIndex, spriteManifest, timelessKeystoneTransformations]);
  const masteryGroups = useMemo(() => {
    if (!activeTree) {
      return [];
    }

    const groups = new Map<string, { count: number; lines: string[]; title: string }>();

    for (const nodeId of activeTree.nodes) {
      const node = nodeIndex.get(nodeId);
      if (!node?.isMastery) {
        continue;
      }

      const description = describePassiveTreeNode(node, activeTree);
      const existing = groups.get(description.title);
      if (existing) {
        existing.count += 1;
        for (const line of description.lines) {
          if (!existing.lines.includes(line)) {
            existing.lines.push(line);
          }
        }
        continue;
      }

      groups.set(description.title, {
        count: 1,
        lines: [...description.lines],
        title: description.title,
      });
    }

    return [...groups.values()];
  }, [activeTree, nodeIndex]);
  const runegraftGroups = useMemo(
    () => (activeTree ? groupTreeOverrides(activeTree.overrides, /\bRunegraft\b/i) : []),
    [activeTree],
  );
  const tattooGroups = useMemo(
    () => (activeTree ? groupTreeOverrides(activeTree.overrides, /\bTattoo\b/i) : []),
    [activeTree],
  );
  const tooltipPlacement = useMemo(() => {
    if (!hoveredNodeState || typeof window === "undefined") {
      return "tree-tooltip-placement-right-below";
    }

    const horizontal = hoveredNodeState.clientX > window.innerWidth * 0.68 ? "left" : "right";
    const vertical = hoveredNodeState.clientY > window.innerHeight * 0.68 ? "above" : "below";
    return `tree-tooltip-placement-${horizontal}-${vertical}`;
  }, [hoveredNodeState]);
  const treeHeaderSummary = useMemo(() => {
    if (!activeTree) {
      return [];
    }

    let passives = 0;
    let notables = 0;
    let keystones = 0;
    let masteries = 0;

    for (const nodeId of activeTree.nodes) {
      const node = layoutNodeIndex.get(nodeId);
      if (!node) {
        continue;
      }

      if (node.isMastery) {
        masteries += 1;
        continue;
      }

      if (node.isKeystone) {
        keystones += 1;
        continue;
      }

      if (node.isNotable) {
        notables += 1;
        continue;
      }

      if (node.isJewelSocket || node.classStartIndex !== undefined || node.isAscendancyStart) {
        continue;
      }

      passives += 1;
    }

    const tattoos = countTreeOverrides(activeTree.overrides, /\bTattoo\b/i);
    const runegrafts = countTreeOverrides(activeTree.overrides, /\bRunegraft\b/i);

    return [
      { key: "passives", label: "Passives", value: passives },
      { key: "notables", label: "Notables", value: notables },
      { key: "masteries", label: "Masteries", value: masteries },
      { key: "keystones", label: "Keystones", value: keystones },
      { key: "jewels", label: "Jewels", value: activeTree.sockets.length },
      { key: "tattoos", label: "Tattoos", value: tattoos },
      { key: "runegrafts", label: "Runegrafts", value: runegrafts },
    ] satisfies PassiveTreeHeaderSummaryEntry[];
  }, [activeTree, layoutNodeIndex]);

  if (!activeTree) {
    return (
      <section className="panel tree-panel">
        <div className="panel-toolbar tree-panel-heading">
          <h2>Passive Tree</h2>
        </div>
        <div className="tree-placeholder">No tree specs found.</div>
      </section>
    );
  }

  function fitBuild() {
    if (!displayLayout || !activeTree || !viewBounds) {
      return;
    }
    applyViewport(getPassiveTreeInitialViewport(displayLayout, activeTree.nodes, viewBounds));
  }

  function fitTree() {
    if (!displayLayout || !viewBounds) {
      return;
    }
    applyViewport(getPassiveTreeCenteredViewport(displayLayout, visibleNodeIds, DEFAULT_VIEWPORT.zoom, viewBounds));
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (!viewBoundsRef.current || event.button !== 0) {
      return;
    }

    dragRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
    };
    shellRef.current?.classList.add("tree-canvas-shell-dragging");
    setHoveredNode(null);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!svgRef.current || !dragRef.current || dragRef.current.pointerId !== event.pointerId || !viewBoundsRef.current) {
      return;
    }

    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const deltaX = event.clientX - dragRef.current.clientX;
    const deltaY = event.clientY - dragRef.current.clientY;
    dragRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
    };

    const currentViewport = viewportRef.current;
    const worldPerPixelX = viewBoundsRef.current.width / rect.width / currentViewport.zoom;
    const worldPerPixelY = viewBoundsRef.current.height / rect.height / currentViewport.zoom;

    applyViewport(
      {
        panX: currentViewport.panX - deltaX * worldPerPixelX,
        panY: currentViewport.panY - deltaY * worldPerPixelY,
        zoom: currentViewport.zoom,
      },
    );
  }

  function handlePointerEnd(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;
    shellRef.current?.classList.remove("tree-canvas-shell-dragging");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleWheelCapture(event: ReactWheelEvent<HTMLDivElement>) {
    if (!zoomUnlocked || !viewBoundsRef.current) {
      return;
    }

    const delta = event.deltaY === 0 ? event.deltaX : event.deltaY;
    if (delta > 0 && viewportRef.current.zoom <= MIN_INTERACTIVE_ZOOM + ZOOM_EPSILON) {
      return;
    }
    if (delta < 0 && viewportRef.current.zoom >= PASSIVE_TREE_MAX_ZOOM - ZOOM_EPSILON) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const factor = Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY);
    zoomAtClientPoint(viewportRef.current.zoom * factor, event.clientX, event.clientY);
  }

  useEffect(() => {
    const handleWindowWheel = (event: WheelEvent) => {
      const shell = shellRef.current;
      const target = event.target;
      if (!zoomUnlocked || !shell || !(target instanceof Node) || !shell.contains(target) || !viewBoundsRef.current) {
        return;
      }

      const delta = event.deltaY === 0 ? event.deltaX : event.deltaY;
      if (delta > 0 && viewportRef.current.zoom <= MIN_INTERACTIVE_ZOOM + ZOOM_EPSILON) {
        return;
      }
      if (delta < 0 && viewportRef.current.zoom >= PASSIVE_TREE_MAX_ZOOM - ZOOM_EPSILON) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const factor = Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY);
      zoomAtClientPoint(viewportRef.current.zoom * factor, event.clientX, event.clientY);
    };

    window.addEventListener("wheel", handleWindowWheel, {
      capture: true,
      passive: false,
    });

    return () => {
      window.removeEventListener("wheel", handleWindowWheel, {
        capture: true,
      });
    };
  }, [zoomAtClientPoint, zoomUnlocked]);

  return (
    <section
      ref={panelRef}
      className="panel tree-panel"
      onFocusCapture={activateTreeAssets}
      onPointerEnter={activateTreeAssets}
    >
      <div className="panel-toolbar tree-panel-heading">
        <h2>Passive Tree</h2>
        {payload.treeSpecs.length > 1 && (
          <>
            <label htmlFor="tree-spec" className="meta">
              Tree Spec
            </label>
            <select
              id="tree-spec"
              value={treeIndex}
              onChange={(event) => {
                const nextTreeIndex = Number(event.target.value);
                if (controlledTreeIndex === undefined) {
                  setInternalTreeIndex(nextTreeIndex);
                }
                onTreeIndexChange?.(nextTreeIndex);
              }}
            >
              {payload.treeSpecs.map((tree, index) => (
                <option key={`tree-spec:${index}`} value={index}>
                  {getTreeSpecLabel(index, tree.title)}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
      {treeHeaderSummary.length > 0 && (
        <div className="tree-header-summary">
          {treeHeaderSummary.map((entry) => (
            <span className="tree-header-summary-entry" key={`tree-summary:${entry.key}`}>
              <span className="tree-header-summary-value">{entry.value}</span>
              <span className="tree-header-summary-label">{entry.label}</span>
            </span>
          ))}
        </div>
      )}
      <div className="tree-actions">
        <button type="button" className="btn btn-secondary tree-focus-btn" onClick={fitBuild} disabled={!layout}>
          Fit Build
        </button>
        <button type="button" className="btn btn-secondary tree-focus-btn" onClick={fitTree} disabled={!layout}>
          Fit Tree
        </button>
      </div>

      {!treeAssetsActivated && (
        <div className="tree-placeholder">Passive tree assets will load when this panel scrolls into view.</div>
      )}

      {treeAssetsActivated && !layout && layoutState.status === "loading" && (
        <div className="tree-placeholder">Loading passive tree layout...</div>
      )}

      {layoutState.status === "error" && <div className="tree-placeholder">{layoutState.error}</div>}

      {layout && staticViewBox && (
        <>
          <div className="tree-layout">
            <div className="tree-layout-main">
              <div
                ref={shellRef}
                className="tree-canvas-shell"
                onWheelCapture={handleWheelCapture}
              >
                <svg
                  ref={svgRef}
                  className="tree-canvas"
                  viewBox={staticViewBox}
                  onPointerCancel={handlePointerEnd}
                  onPointerDown={handlePointerDown}
                  onPointerLeave={handlePointerEnd}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerEnd}
                >
                  <g ref={sceneRef} style={{ willChange: "transform" }}>
                    <g className="tree-layer tree-layer-jewel-radii">
                      {jewelRadiusOverlays.map((overlay) => (
                        <circle
                          key={`tree-jewel-radius:${overlay.nodeId}:${overlay.itemId}`}
                          className="tree-jewel-radius-circle"
                          cx={overlay.x}
                          cy={overlay.y}
                          r={overlay.radius}
                        />
                      ))}
                    </g>

                    <g className="tree-layer tree-layer-links tree-layer-links-all">
                      {allLinkPath && <path className="tree-link tree-link-all" d={allLinkPath} />}
                    </g>

                    <g className="tree-layer tree-layer-links">
                      {activeLinkPath && <path className="tree-link tree-link-active" d={activeLinkPath} />}
                    </g>

                    <g className="tree-layer tree-layer-nodes">
                      {inactiveNodeBatch.shadowPath && <path className="tree-node-shadow" d={inactiveNodeBatch.shadowPath} />}
                      {inactiveNodeBatch.batches.map((batch) => (
                        <g className={`tree-node tree-node-${batch.kind}`} key={`tree-node-batch:${batch.kind}`}>
                          {batch.ringPath && <path className="tree-node-ring" d={batch.ringPath} />}
                          {batch.corePath && <path className="tree-node-core" d={batch.corePath} />}
                        </g>
                      ))}
                    </g>

                    <g className="tree-layer tree-layer-nodes">
                      {allocatedNodes.map((node) => (
                        <TreeNode
                          key={`tree-node:active:${node.id}`}
                          node={node}
                          allocated
                          onHoverChange={setHoveredNode}
                        />
                      ))}
                    </g>
                  </g>
                </svg>

                {(hoveredSocketedItem || hoveredDescription) && (
                  <aside
                    className={`tree-tooltip${hoveredSocketedItem ? " tree-tooltip-item" : ""}${hoveredNodeState ? ` tree-tooltip-follow ${tooltipPlacement}` : ""}`}
                    style={
                      hoveredNodeState
                        ? {
                            left: hoveredNodeState.clientX,
                            top: hoveredNodeState.clientY,
                          }
                        : undefined
                    }
                  >
                    {hoveredSocketedItem ? (
                      <ItemTooltip item={hoveredSocketedItem} />
                    ) : (
                      <>
                        <div className="tree-tooltip-kind">{hoveredDescription?.kind}</div>
                        <div className="tree-tooltip-title">{hoveredDescription?.title}</div>
                        {hoveredDescription && hoveredDescription.lines.length > 0 ? (
                          <div className="tree-tooltip-lines">
                            {hoveredDescription.lines.map((line) => (
                              <div key={`tree-tooltip-line:${hoveredDescription.title}:${line}`}>{line}</div>
                            ))}
                          </div>
                        ) : (
                          <div className="meta">No explicit stat lines exported for this node.</div>
                        )}
                        {hoveredDescription && hoveredDescription.reminderText.length > 0 && (
                          <div className="tree-tooltip-reminder">
                            {hoveredDescription.reminderText.map((line) => (
                              <div key={`tree-tooltip-reminder:${hoveredDescription.title}:${line}`}>{line}</div>
                            ))}
                          </div>
                        )}
                        {hoveredDescription && hoveredDescription.flavourText.length > 0 && (
                          <div className="tree-tooltip-flavour">
                            {hoveredDescription.flavourText.map((line) => (
                              <div key={`tree-tooltip-flavour:${hoveredDescription.title}:${line}`}>{line}</div>
                            ))}
                          </div>
                        )}
                        {hoveredDescription?.overridden && <div className="tree-tooltip-override">Override imported from PoB.</div>}
                      </>
                    )}
                  </aside>
                )}

                <button
                  type="button"
                  className={`tree-zoom-toggle${zoomUnlocked ? " tree-zoom-toggle-unlocked" : ""}`}
                  aria-label={zoomUnlocked ? "Lock passive tree zoom" : "Unlock passive tree zoom"}
                  aria-pressed={zoomUnlocked}
                  title={zoomUnlocked ? "Lock passive tree zoom" : "Unlock passive tree zoom"}
                  onClick={() => setZoomUnlocked((current) => !current)}
                >
                  <TreeZoomLockIcon unlocked={zoomUnlocked} />
                </button>
              </div>
            </div>

            <aside className="tree-summary-panel">
              <div className="tree-summary-section">
                <div className="tree-summary-heading">Keystones</div>
                {keystoneEntries.length > 0 ? (
                  <div className="tree-summary-list">
                    {keystoneEntries.map((entry) => (
                      <article key={`tree-keystone:${entry.id}`} className="tree-summary-card tree-summary-card-keystone">
                        <PassiveTreeSpriteTile label={entry.description.title} sprite={entry.sprite} />
                        <div className="tree-summary-card-body">
                          <div className="tree-summary-card-title">{entry.description.title}</div>
                          <div className="tree-summary-card-lines">
                            {entry.description.lines.map((line) => (
                              <div key={`tree-keystone-line:${entry.id}:${line}`}>{line}</div>
                            ))}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="meta">No keystones allocated.</div>
                )}
              </div>

              <div className="tree-summary-section">
                <div className="tree-summary-heading">Masteries</div>
                {masteryGroups.length > 0 ? (
                  <div className="tree-summary-list">
                    {masteryGroups.map((group) => (
                      <article key={`tree-mastery:${group.title}`} className="tree-summary-card tree-summary-card-mastery">
                        <div className="tree-summary-card-body">
                          <div className="tree-summary-card-title">
                            {group.title} ({group.count})
                          </div>
                          <div className="tree-summary-card-lines">
                            {group.lines.map((line) => (
                              <div key={`tree-mastery-line:${group.title}:${line}`}>{line}</div>
                            ))}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="meta">No masteries selected.</div>
                )}
              </div>

              <div className="tree-summary-section">
                <div className="tree-summary-heading">Runegrafts</div>
                {runegraftGroups.length > 0 ? (
                  <div className="tree-summary-list">
                    {runegraftGroups.map((group) => (
                      <article key={`tree-runegraft:${group.title}`} className="tree-summary-card tree-summary-card-mastery">
                        <div className="tree-summary-card-body">
                          <div className="tree-summary-card-title">
                            {group.title}
                            {group.count > 1 ? ` (${group.count})` : ""}
                          </div>
                          {group.lines.length > 0 && (
                            <div className="tree-summary-card-lines">
                              {group.lines.map((line) => (
                                <div key={`tree-runegraft-line:${group.title}:${line}`}>{line}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="meta">No runegrafts selected.</div>
                )}
              </div>

              <div className="tree-summary-section">
                <div className="tree-summary-heading">Tattoos</div>
                {tattooGroups.length > 0 ? (
                  <div className="tree-summary-list">
                    {tattooGroups.map((group) => (
                      <article key={`tree-tattoo:${group.title}`} className="tree-summary-card tree-summary-card-mastery">
                        <div className="tree-summary-card-body">
                          <div className="tree-summary-card-title">
                            {group.title} (x{group.count})
                          </div>
                          {group.lines.length > 0 && (
                            <div className="tree-summary-card-lines">
                              {group.lines.map((line) => (
                                <div key={`tree-tattoo-line:${group.title}:${line}`}>{line}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="meta">No tattoos selected.</div>
                )}
              </div>
            </aside>
          </div>
          <div className="tree-footnote meta">Current zoom: {displayZoom.toFixed(2)}x</div>
        </>
      )}
    </section>
  );
}

function TreeZoomLockIcon({ unlocked }: { unlocked: boolean }) {
  return (
    <svg aria-hidden="true" className="tree-zoom-toggle-icon" viewBox="0 0 24 24">
      {unlocked ? (
        <>
          <path
            d="M6.7 11.4V7.4C6.7 5 8.55 3.15 10.95 3.15C13.35 3.15 15.2 5 15.2 7.4V10.3"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <rect
            x="10.1"
            y="10.3"
            width="8.2"
            height="9.7"
            rx="2.1"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </>
      ) : (
        <>
          <path
            d="M8 10V7.5C8 5.01 10.01 3 12.5 3C14.99 3 17 5.01 17 7.5V10"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <rect
            x="5.5"
            y="9.5"
            width="14"
            height="10.5"
            rx="2.4"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </>
      )}
      <circle cx={unlocked ? 14.2 : 12.5} cy="14.75" r="1.55" fill="currentColor" />
    </svg>
  );
}

const TreeNode = memo(function TreeNode({
  allocated,
  node,
  onHoverChange,
}: {
  allocated: boolean;
  node: PassiveTreeLayoutNode;
  onHoverChange?: Dispatch<SetStateAction<HoveredTreeNodeState | null>>;
}) {
  const kind = getPassiveTreeNodeKind(node);
  const radius = getPassiveTreeNodeRadius(node) * 1.4;
  const isInteractive = allocated && onHoverChange !== undefined;
  const shadowRadius = radius + (allocated ? 12 : 6);

  function clearHover() {
    onHoverChange?.((current) => (current?.nodeId === node.id ? null : current));
  }

  function setHoverFromMouse(event: ReactMouseEvent<SVGGElement>) {
    onHoverChange?.({
      clientX: event.clientX,
      clientY: event.clientY,
      nodeId: node.id,
    });
  }

  function setHoverFromFocus(event: ReactFocusEvent<SVGGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    onHoverChange?.({
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      nodeId: node.id,
    });
  }

  return (
    <g
      className={`tree-node tree-node-${kind}${allocated ? " tree-node-allocated" : ""}${isInteractive ? " tree-node-interactive" : ""}`}
      transform={`translate(${node.x} ${node.y})`}
      onBlur={clearHover}
      onFocus={setHoverFromFocus}
      onMouseEnter={setHoverFromMouse}
      onMouseLeave={clearHover}
      onMouseMove={setHoverFromMouse}
      tabIndex={isInteractive ? 0 : -1}
    >
      <circle className="tree-node-shadow" cx={0} cy={0} r={shadowRadius} />
      <circle className="tree-node-ring" cx={0} cy={0} r={radius} />
      <circle className="tree-node-core" cx={0} cy={0} r={Math.max(radius - 12, 12)} />
    </g>
  );
});

function buildPassiveTreeLinkBatchPath(
  links: PassiveTreeLink[],
  nodeIndex: ReadonlyMap<number, PassiveTreeLayoutNode>,
): string {
  return links
    .map((link) => {
      const source = nodeIndex.get(link.sourceId);
      const target = nodeIndex.get(link.targetId);
      return source && target ? getPassiveTreeLinkPath(source, target) : "";
    })
    .filter((path) => path.length > 0)
    .join(" ");
}

function buildPassiveTreeNodeBatch(nodes: PassiveTreeLayoutNode[]): BatchedPassiveTreeNodes {
  const shadowSegments: string[] = [];
  const ringSegmentsByKind = new Map<PassiveTreeNodeKind, string[]>();
  const coreSegmentsByKind = new Map<PassiveTreeNodeKind, string[]>();

  for (const kind of PASSIVE_TREE_NODE_BATCH_KINDS) {
    ringSegmentsByKind.set(kind, []);
    coreSegmentsByKind.set(kind, []);
  }

  for (const node of nodes) {
    const kind = getPassiveTreeNodeKind(node);
    const radius = getPassiveTreeNodeRadius(node) * 1.4;
    shadowSegments.push(buildPassiveTreeCirclePath(node.x, node.y, radius + 6));
    ringSegmentsByKind.get(kind)?.push(buildPassiveTreeCirclePath(node.x, node.y, radius));
    coreSegmentsByKind.get(kind)?.push(buildPassiveTreeCirclePath(node.x, node.y, Math.max(radius - 12, 12)));
  }

  return {
    batches: PASSIVE_TREE_NODE_BATCH_KINDS.map((kind) => ({
      corePath: coreSegmentsByKind.get(kind)?.join(" ") ?? "",
      kind,
      ringPath: ringSegmentsByKind.get(kind)?.join(" ") ?? "",
    })).filter((batch) => batch.ringPath.length > 0 || batch.corePath.length > 0),
    shadowPath: shadowSegments.join(" "),
  };
}

function buildPassiveTreeCirclePath(cx: number, cy: number, radius: number): string {
  const leftX = roundSvgPathCoordinate(cx - radius);
  const diameter = roundSvgPathCoordinate(radius * 2);
  const centerY = roundSvgPathCoordinate(cy);
  const arcRadius = roundSvgPathCoordinate(radius);
  return `M ${leftX} ${centerY} a ${arcRadius} ${arcRadius} 0 1 0 ${diameter} 0 a ${arcRadius} ${arcRadius} 0 1 0 -${diameter} 0`;
}

function roundSvgPathCoordinate(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function PassiveTreeSpriteTile({ label, sprite }: { label: string; sprite?: PassiveTreeResolvedSprite }) {
  if (sprite) {
    return (
      <div
        aria-label={label}
        className="tree-summary-icon"
        style={getPassiveTreeSpriteTileStyle(sprite)}
      />
    );
  }

  return <div aria-hidden="true" className="tree-summary-icon tree-summary-icon-placeholder" />;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPassiveTreeSpriteTileStyle(sprite: PassiveTreeResolvedSprite): CSSProperties {
  const targetWidth = 72;
  const scale = targetWidth / sprite.entry.w;
  return {
    backgroundImage: `url(${sprite.atlas.imagePath ?? ""})`,
    backgroundPosition: `-${sprite.entry.x * scale}px -${sprite.entry.y * scale}px`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${sprite.atlas.size.width * scale}px ${sprite.atlas.size.height * scale}px`,
    height: sprite.entry.h * scale,
    width: targetWidth,
  };
}

function isPassiveTreeSpriteManifest(value: unknown): value is PassiveTreeSpriteManifest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return Boolean(record.atlases && typeof record.atlases === "object");
}
